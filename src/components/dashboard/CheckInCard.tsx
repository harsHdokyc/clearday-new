import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Camera, Check, Upload, X, Plus, Pencil, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PhotoState {
  file: File | null;
  preview: string | null;
  isUploaded: boolean;
}

interface CheckInCardProps {
  hasCheckedInToday: boolean;
  onPhotoUpload: (photos: { front?: File; right?: File; left?: File }) => void;
  onRoutineComplete: (steps: { label: string; completed: boolean }[]) => void;
  onRoutineSave: (steps: string[]) => void;
  existingPhotos?: { front?: string; right?: string; left?: string };
  existingRoutineCompleted?: boolean;
  savedRoutineSteps: string[];
  isUploading?: boolean;
}

export function CheckInCard({
  hasCheckedInToday,
  onPhotoUpload,
  onRoutineComplete,
  onRoutineSave,
  existingPhotos,
  existingRoutineCompleted,
  savedRoutineSteps,
  isUploading = false,
}: CheckInCardProps) {
  const [photos, setPhotos] = useState<{
    front: PhotoState;
    right: PhotoState;
    left: PhotoState;
  }>({
    front: { file: null, preview: existingPhotos?.front || null, isUploaded: !!existingPhotos?.front },
    right: { file: null, preview: existingPhotos?.right || null, isUploaded: !!existingPhotos?.right },
    left: { file: null, preview: existingPhotos?.left || null, isUploaded: !!existingPhotos?.left },
  });

  // Sync previews from existingPhotos when we don't have a pending file
  useEffect(() => {
    setPhotos((prev) => ({
      front: prev.front.file ? prev.front : { file: null, preview: existingPhotos?.front || null, isUploaded: !!existingPhotos?.front },
      right: prev.right.file ? prev.right : { file: null, preview: existingPhotos?.right || null, isUploaded: !!existingPhotos?.right },
      left: prev.left.file ? prev.left : { file: null, preview: existingPhotos?.left || null, isUploaded: !!existingPhotos?.left },
    }));
  }, [existingPhotos?.front, existingPhotos?.right, existingPhotos?.left]);

  const [routineSteps, setRoutineSteps] = useState<{ label: string; completed: boolean; completedAt?: number }[]>([]);
  const [isRoutineLoading, setIsRoutineLoading] = useState(true);
  
  useEffect(() => {
    setIsRoutineLoading(true);
    const routineArray = Array.isArray(savedRoutineSteps) ? savedRoutineSteps : [];
    const newSteps = routineArray.map((l) => ({ 
      label: l, 
      completed: !!existingRoutineCompleted 
    }));
    setRoutineSteps(newSteps);
    setIsRoutineLoading(false);
  }, [savedRoutineSteps, existingRoutineCompleted]);

  const [routineDialogOpen, setRoutineDialogOpen] = useState(false);
  const [editingSteps, setEditingSteps] = useState<string[]>([]);
  const [newStepLabel, setNewStepLabel] = useState("");
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [selectedPhotoType, setSelectedPhotoType] = useState<"front" | "right" | "left" | null>(null);
  const fileInputRefs = {
    front: useRef<HTMLInputElement>(null),
    right: useRef<HTMLInputElement>(null),
    left: useRef<HTMLInputElement>(null),
  };

  const handlePhotoSelect = (viewType: "front" | "right" | "left", file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotos((prev) => ({
        ...prev,
        [viewType]: { file, preview: reader.result as string },
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleCameraCapture = (viewType: "front" | "right" | "left") => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Use rear camera by default
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handlePhotoSelect(viewType, file);
      }
    };
    input.click();
  };

  const showPhotoOptions = (viewType: "front" | "right" | "left") => {
    setSelectedPhotoType(viewType);
    setPhotoDialogOpen(true);
  };

  const handleCameraSelect = () => {
    if (selectedPhotoType) {
      handleCameraCapture(selectedPhotoType);
      setPhotoDialogOpen(false);
      setSelectedPhotoType(null);
    }
  };

  const handleGallerySelect = () => {
    if (selectedPhotoType) {
      fileInputRefs[selectedPhotoType].current?.click();
      setPhotoDialogOpen(false);
      setSelectedPhotoType(null);
    }
  };

  const handleRemovePhoto = (viewType: "front" | "right" | "left") => {
    // Only allow removal if photo hasn't been uploaded yet
    if (photos[viewType].isUploaded) return;
    setPhotos((prev) => ({ ...prev, [viewType]: { file: null, preview: null, isUploaded: false } }));
  };

  const handleUploadClick = () => {
    const photoFiles: { front?: File; right?: File; left?: File } = {};
    if (photos.front.file) photoFiles.front = photos.front.file;
    if (photos.right.file) photoFiles.right = photos.right.file;
    if (photos.left.file) photoFiles.left = photos.left.file;
    if (Object.keys(photoFiles).length === 0) return;
    onPhotoUpload(photoFiles);
    setPhotos((prev) => ({
      front: { file: null, preview: prev.front.preview, isUploaded: true },
      right: { file: null, preview: prev.right.preview, isUploaded: true },
      left: { file: null, preview: prev.left.preview, isUploaded: true },
    }));
  };

  const hasPendingPhotos = Object.values(photos).some((p) => p.file !== null);

  const toggleRoutineStep = (label: string) => {
    const now = Date.now();
    const next = routineSteps.map((s) => {
      if (s.label === label) {
        if (s.completed) {
          // Check if within 10-second window
          const timeSinceCompletion = s.completedAt ? now - s.completedAt : Infinity;
          if (timeSinceCompletion > 10000) {
            // Don't allow deselect after 10 seconds
            return s;
          }
          // Allow deselect within 10 seconds
          return { ...s, completed: false, completedAt: undefined };
        } else {
          // Allow checking
          return { ...s, completed: true, completedAt: now };
        }
      }
      return s;
    });
    setRoutineSteps(next);
    onRoutineComplete(next);
  };

  const openRoutineDialog = () => {
    setEditingSteps(savedRoutineSteps.length ? [...savedRoutineSteps] : []);
    setNewStepLabel("");
    setRoutineDialogOpen(true);
  };

  const addEditingStep = () => {
    const t = newStepLabel.trim();
    if (!t) return;
    setEditingSteps((prev) => [...prev, t]);
    setNewStepLabel("");
  };

  const removeEditingStep = (i: number) => {
    setEditingSteps((prev) => prev.filter((_, idx) => idx !== i));
  };

  const saveRoutine = () => {
    onRoutineSave(editingSteps);
    setRoutineDialogOpen(false);
  };

  const completedCount = routineSteps.filter((s) => s.completed).length;
  const hasUploadedPhotos = Object.values(photos).some((p) => p.isUploaded);
  const showBadge = hasUploadedPhotos && completedCount > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="rounded-2xl bg-card p-6 shadow-soft"
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">Today&apos;s Check-in</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </p>
        </div>
        {showBadge && (
          <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
            {completedCount}/{savedRoutineSteps.length} done
          </span>
        )}
      </div>

      {/* Photo slots + Upload button */}
      <div className="mb-5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Face Photos
        </p>
        <div className="grid grid-cols-3 gap-2">
          {(["front", "right", "left"] as const).map((viewType) => (
            <div key={viewType} className="relative">
              <input
                ref={fileInputRefs[viewType]}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handlePhotoSelect(viewType, e.target.files?.[0] ?? null)}
              />
              {photos[viewType].preview ? (
                <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-success">
                  <img
                    src={photos[viewType].preview!}
                    alt={viewType}
                    className="w-full h-full object-cover"
                  />
                  {!photos[viewType].isUploaded && (
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(viewType)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      <X size={12} />
                    </button>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 text-center uppercase">
                    {viewType}
                  </div>
                </div>
              ) : (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => showPhotoOptions(viewType)}
                  className={cn(
                    "w-full aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1.5",
                    "border-border hover:border-primary/50 hover:bg-primary/5"
                  )}
                >
                  <Camera className="h-5 w-5 text-muted-foreground" />
                  <span className="text-[10px] font-medium text-foreground uppercase">{viewType}</span>
                </motion.button>
              )}
            </div>
          ))}
        </div>
        <Button
          className="w-full mt-3 gap-2"
          onClick={handleUploadClick}
          disabled={!hasPendingPhotos || isUploading}
        >
          <Upload size={16} />
          {isUploading ? "Uploading…" : "Upload photos"}
        </Button>
      </div>

      {/* Routine: Create or checklist */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Your routine
        </p>
        {isRoutineLoading ? (
          <div className="flex items-center justify-center p-4 rounded-xl border-2 border-dashed border-border">
            <div className="text-sm text-muted-foreground">Loading routine...</div>
          </div>
        ) : savedRoutineSteps.length === 0 ? (
          <motion.button
            type="button"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={openRoutineDialog}
            disabled={!hasUploadedPhotos}
            className={cn(
              "w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed",
              "border-border hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-foreground",
              !hasUploadedPhotos && "opacity-50 cursor-not-allowed"
            )}
          >
            <ListChecks size={18} />
            <span>{hasUploadedPhotos ? "Edit your skincare routine" : "Upload photos first to create routine"}</span>
          </motion.button>
        ) : (
          <>
            <div className="space-y-1.5">
              {routineSteps.map((step) => {
                const now = Date.now();
                const timeSinceCompletion = step.completedAt ? now - step.completedAt : 0;
                const canDeselect = step.completed && timeSinceCompletion <= 10000;
                const isLocked = step.completed && timeSinceCompletion > 10000;
                
                return (
                <motion.button
                  key={step.label}
                  type="button"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => toggleRoutineStep(step.label)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left",
                    step.completed ? "bg-success/10" : "bg-muted/50 hover:bg-muted",
                    isLocked && "cursor-not-allowed opacity-75"
                  )}
                  title={isLocked ? "Locked: Cannot deselect after 10 seconds" : ""}
                >
                  <div
                    className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                      step.completed ? "bg-success text-success-foreground" : "bg-background text-muted-foreground"
                    )}
                  >
                    {step.completed ? <Check size={16} /> : null}
                  </div>
                  <div className="flex-1">
                    <span className={cn("text-sm font-medium", step.completed ? "text-success" : "text-foreground")}>
                      {step.label}
                    </span>
                    {isLocked && (
                      <div className="text-xs text-muted-foreground mt-0.5">Locked</div>
                    )}
                  </div>
                </motion.button>
              )})}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full gap-2 text-muted-foreground"
              onClick={openRoutineDialog}
              disabled={!hasUploadedPhotos}
            >
              <Pencil size={14} />
              {hasUploadedPhotos ? "Edit routine" : "Upload photos first to edit"}
            </Button>
          </>
        )}
      </div>

      {/* Create / Edit routine dialog */}
      <Dialog open={routineDialogOpen} onOpenChange={setRoutineDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSteps.length ? "Edit your routine" : "Create your skincare routine"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Cleanser, Toner, Serum…"
                value={newStepLabel}
                onChange={(e) => setNewStepLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addEditingStep())}
              />
              <Button type="button" size="icon" onClick={addEditingStep} className="shrink-0">
                <Plus size={18} />
              </Button>
            </div>
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {editingSteps.map((label, i) => (
                <li
                  key={`${i}-${label}`}
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50"
                >
                  <span className="text-sm font-medium truncate">{label}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => removeEditingStep(i)}
                  >
                    <X size={14} />
                  </Button>
                </li>
              ))}
            </ul>
            {editingSteps.length === 0 && (
              <p className="text-sm text-muted-foreground">Add steps in order. You can change this later.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoutineDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveRoutine}>Save routine</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Photo selection alert dialog */}
      <AlertDialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Choose Photo Source</AlertDialogTitle>
            <AlertDialogDescription>
              How would you like to add your {selectedPhotoType} photo?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleGallerySelect}>
              Choose from Gallery
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleCameraSelect}>
              Use Camera
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
