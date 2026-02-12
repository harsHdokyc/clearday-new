import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, FlaskConical, Sparkles, Check, AlertTriangle, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { evaluateProduct } from "@/lib/ai";
import { useAuth } from "@/contexts/AuthContext";
import { saveProductEvaluation, getUserProductEvaluations } from "@/lib/storage";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ProductEvaluation {
  name: string;
  fitScore: number;
  verdict: "great" | "good" | "caution";
  insights: string[];
  similarUserFeedback: string;
  ingredients: { name: string; benefit: string; concern?: string }[];
}

interface RecentProduct extends ProductEvaluation {
  id: string;
  created_at: string;
}

// Mock product evaluations
const mockEvaluations: Record<string, ProductEvaluation> = {
  "niacinamide serum": {
    name: "Niacinamide 10% + Zinc 1%",
    fitScore: 87,
    verdict: "great",
    insights: [
      "Excellent for oily/acne-prone skin",
      "Helps minimize pore appearance",
      "May cause initial purging in first 2 weeks",
    ],
    similarUserFeedback: "78% of users with your skin type saw improvement within 4 weeks",
    ingredients: [
      { name: "Niacinamide", benefit: "Reduces sebum, minimizes pores" },
      { name: "Zinc PCA", benefit: "Sebum control, anti-inflammatory" },
    ],
  },
  "retinol": {
    name: "Retinol 0.5%",
    fitScore: 72,
    verdict: "good",
    insights: [
      "Start slow - 2x per week initially",
      "Always use with SPF during the day",
      "Not recommended with other actives",
    ],
    similarUserFeedback: "65% reported visible anti-aging results after 8 weeks",
    ingredients: [
      { name: "Retinol", benefit: "Cell turnover, anti-aging", concern: "Can cause irritation" },
      { name: "Squalane", benefit: "Hydration, barrier support" },
    ],
  },
  "vitamin c": {
    name: "Vitamin C 15% Serum",
    fitScore: 91,
    verdict: "great",
    insights: [
      "Best used in morning routine",
      "Brightening effects visible in 3-4 weeks",
      "Store in cool, dark place",
    ],
    similarUserFeedback: "82% saw improved skin brightness within 6 weeks",
    ingredients: [
      { name: "L-Ascorbic Acid", benefit: "Antioxidant, brightening" },
      { name: "Vitamin E", benefit: "Enhanced stability, moisturizing" },
    ],
  },
  "salicylic acid": {
    name: "Salicylic Acid 2%",
    fitScore: 68,
    verdict: "caution",
    insights: [
      "Can be drying - pair with moisturizer",
      "Great for blackheads and whiteheads",
      "Don't overuse - 1x daily max",
    ],
    similarUserFeedback: "21% of similar users reported dryness after week two",
    ingredients: [
      { name: "Salicylic Acid", benefit: "Exfoliation, unclogs pores", concern: "Drying for some skin types" },
    ],
  },
};

export default function Products() {
  const { user, profile } = useAuth();
  const [productUrl, setProductUrl] = useState("");
  const [evaluation, setEvaluation] = useState<ProductEvaluation | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");
  const [recentProducts, setRecentProducts] = useState<RecentProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<RecentProduct | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    getUserProductEvaluations(user.id, 10).then((rows) => {
      setRecentProducts(
        (rows as { 
          id: string;
          product_name: string; 
          fit_score: number; 
          verdict: string; 
          insight_message?: string;
          created_at: string;
        }[]).map((r) => ({
          id: r.id,
          name: r.product_name,
          fitScore: r.fit_score,
          verdict: r.verdict as "great" | "good" | "caution",
          insights: r.insight_message ? [r.insight_message] : ["Product evaluation available"],
          similarUserFeedback: r.insight_message || "Based on your skin profile analysis",
          ingredients: [],
          created_at: r.created_at,
        }))
      );
    });
  }, [user?.id]);

  const extractProductName = (url: string): string => {
    try {
      const urlLower = url.toLowerCase();
      
      // Check if it's a URL
      if (urlLower.includes('http') || urlLower.includes('www.')) {
        // Extract from Amazon URLs
        if (urlLower.includes('amazon')) {
          // Try multiple Amazon patterns
          const patterns = [
            /\/dp\/([^\/?]+)/i,
            /\/gp\/product\/([^\/?]+)/i,
            /[?&]k=([^&]+)/i,
            /\/([^\/]+)\/dp\//i
          ];
          for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
              let name = decodeURIComponent(match[1].replace(/[+-]/g, ' '));
              // Clean up common Amazon URL artifacts
              name = name.replace(/[^a-zA-Z0-9\s\-]/g, '').trim();
              if (name.length > 5) return name;
            }
          }
        }
        
        // Extract from Sephora URLs
        if (urlLower.includes('sephora')) {
          const match = url.match(/\/product\/([^\/?]+)/i) || url.match(/\/([^\/]+)-P\d+/i);
          if (match && match[1]) {
            let name = decodeURIComponent(match[1].replace(/[-_]/g, ' '));
            name = name.replace(/[^a-zA-Z0-9\s\-]/g, '').trim();
            if (name.length > 5) return name;
          }
        }
        
        // Extract from Ulta URLs
        if (urlLower.includes('ulta')) {
          const match = url.match(/\/product\/([^\/?]+)/i) || url.match(/\/([^\/?]+)\?/i);
          if (match && match[1]) {
            let name = decodeURIComponent(match[1].replace(/[-_]/g, ' '));
            name = name.replace(/[^a-zA-Z0-9\s\-]/g, '').trim();
            if (name.length > 5) return name;
          }
        }
        
        // Extract from general e-commerce URLs
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const pathParts = pathname.split('/').filter(p => p.length > 0);
        
        // Try to find product-like parts (usually contain keywords)
        const productKeywords = ['product', 'item', 'p', 'sku', 'model'];
        let productPart = null;
        
        // Look for parts with product keywords
        for (let i = pathParts.length - 1; i >= 0; i--) {
          const part = pathParts[i];
          if (productKeywords.some(keyword => part.toLowerCase().includes(keyword))) {
            // Get the next part which might be the product name
            if (i + 1 < pathParts.length) {
              productPart = pathParts[i + 1];
              break;
            }
          }
        }
        
        // If no product keyword found, try the last meaningful part
        if (!productPart) {
          for (let i = pathParts.length - 1; i >= 0; i--) {
            const part = pathParts[i];
            // Skip common non-product parts
            if (!part.match(/^(www|http|https|com|org|net|edu|gov)$/i) && 
                part.length > 3 && 
                !part.includes('?') && 
                !part.includes('#') &&
                !part.match(/^\d+$/)) { // Skip pure numbers
              productPart = part;
              break;
            }
          }
        }
        
        if (productPart) {
          let name = decodeURIComponent(productPart.replace(/[-_]/g, ' '));
          // Clean up the name
          name = name.replace(/[^a-zA-Z0-9\s\-]/g, ' ').trim();
          name = name.replace(/\s+/g, ' ');
          
          // Capitalize words
          name = name.split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          ).join(' ');
          
          // Smart truncation for long names - try to keep key product info
          if (name.length > 80) {
            // Split by words and try to keep the most important ones
            const words = name.split(' ');
            const keyWords = ['spf', 'sunscreen', 'serum', 'cream', 'moisturizer', 'cleanser', 'toner', 'mask', 'oil'];
            
            // Try to find a good cutoff point
            let cutoffIndex = Math.floor(words.length * 0.6); // Default to 60% of words
            for (let i = 0; i < words.length; i++) {
              if (keyWords.includes(words[i].toLowerCase()) && i > 3) {
                cutoffIndex = i + 1; // Include this keyword
                break;
              }
            }
            
            name = words.slice(0, cutoffIndex).join(' ') + '...';
          }
          
          if (name.length > 5) return name;
        }
        
        // Fallback: try to get from URL parameters
        const searchParams = urlObj.searchParams;
        for (const [key, value] of searchParams) {
          if (key.toLowerCase().includes('product') || 
              key.toLowerCase().includes('item') || 
              key.toLowerCase().includes('name') ||
              key.toLowerCase().includes('q') ||
              key.toLowerCase().includes('search')) {
            let name = decodeURIComponent(value.replace(/[-_]/g, ' '));
            name = name.replace(/[^a-zA-Z0-9\s\-]/g, ' ').trim();
            if (name.length > 5) return name;
          }
        }
      }
      
      // If not a URL or couldn't extract, try to clean up the input
      let cleaned = url.replace(/https?:\/\/(www\.)?/i, '');
      cleaned = cleaned.split('/')[0];
      cleaned = cleaned.split('?')[0];
      cleaned = cleaned.replace(/[-_]/g, ' ');
      cleaned = cleaned.replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
      cleaned = cleaned.replace(/\s+/g, ' ');
      
      // Capitalize first letter
      if (cleaned.length > 0) {
        cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
      }
      
      // Smart truncation for fallback
      if (cleaned.length > 80) {
        const words = cleaned.split(' ');
        cleaned = words.slice(0, Math.floor(words.length * 0.6)).join(' ') + '...';
      }
      
      return cleaned || 'Unknown Product';
    } catch (error) {
      console.error('Error extracting product name:', error);
      let fallback = url.length > 80 ? url.substring(0, 77) + '...' : url;
      return fallback || 'Unknown Product';
    }
  };

  const handleSearch = async () => {
    if (!productUrl.trim() || !user?.id) return;
    setIsSearching(true);
    setError("");
    setEvaluation(null);
    const skinType = profile?.skin_type || undefined;
    const skinGoal = profile?.skin_goal;
    const goals = skinGoal ? [skinGoal] : undefined;
    const displayName = extractProductName(productUrl);
    
    try {
      const result = await evaluateProduct(productUrl, skinType, goals);
      
      if (!result) {
        setError("AI evaluation temporarily unavailable. Please try again later.");
        return;
      }
      
      const ev = {
        name: displayName,
        fitScore: result.fitScore,
        verdict: result.verdict,
        insights: result.insights,
        similarUserFeedback: result.recommendation,
        ingredients: [] as { name: string; benefit: string; concern?: string }[],
      };
      setEvaluation(ev);
      await saveProductEvaluation(user.id, {
        productName: displayName,
        fitScore: result.fitScore,
        verdict: result.verdict,
        insightMessage: result.recommendation,
      });
      setRecentProducts((prev) => [{ 
        id: Date.now().toString(), // temporary ID
        name: displayName, 
        fitScore: result.fitScore, 
        verdict: result.verdict,
        insights: result.insights,
        similarUserFeedback: result.recommendation,
        ingredients: [],
        created_at: new Date().toISOString(),
      }, ...prev.slice(0, 9)]);
    } catch (err: any) {
      console.error("Product evaluation error:", err);
      setError("Failed to evaluate product. Please check the URL and try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleProductClick = (product: RecentProduct) => {
    setSelectedProduct(product);
    setProductModalOpen(true);
  };

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case "great":
        return "text-success bg-success/10";
      case "good":
        return "text-primary bg-primary/10";
      case "caution":
        return "text-accent bg-accent/10";
      default:
        return "text-muted-foreground bg-muted";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-primary";
    return "text-accent";
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">
            Product Evaluation
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Get AI-powered insights on how products work for your skin type
          </p>
        </motion.div>

        {/* Search Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl p-4 sm:p-6 lg:p-8 shadow-soft mb-6 sm:mb-8"
        >
          <div className="flex items-center gap-2 mb-4 sm:mb-6">
            <FlaskConical className="text-primary" size={20} />
            <h2 className="font-display text-lg sm:text-xl font-semibold">Evaluate a Product</h2>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                placeholder="Enter product URL..."
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10 sm:pl-12 h-12 sm:h-14 text-base sm:text-lg rounded-xl"
              />
            </div>
            <Button
              size="lg"
              onClick={handleSearch}
              disabled={!productUrl.trim() || isSearching}
              className="h-12 sm:h-14 px-6 sm:px-8 rounded-xl"
            >
              {isSearching ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles size={18} />
                </motion.div>
              ) : (
                <>Analyze</>
              )}
            </Button>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-destructive text-xs sm:text-sm bg-destructive/10 p-3 rounded-lg mt-3 sm:mt-4"
            >
              <AlertTriangle size={16} />
              {error}
            </motion.div>
          )}

          <p className="text-xs sm:text-sm text-muted-foreground mt-3 sm:mt-4">
            Powered by Claude AI • Enter a product URL from any skincare retailer
          </p>
        </motion.div>

        {/* Evaluation Result */}
        <AnimatePresence mode="wait">
          {evaluation && (
            <motion.div
              key={evaluation.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-card rounded-2xl p-4 sm:p-6 lg:p-8 shadow-soft mb-6 sm:mb-8"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6 mb-6">
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-2 break-words">
                    {evaluation.name}
                  </h3>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium capitalize",
                      getVerdictColor(evaluation.verdict)
                    )}
                  >
                    {evaluation.verdict === "great" && <Check size={14} />}
                    {evaluation.verdict === "caution" && <AlertTriangle size={14} />}
                    {evaluation.verdict === "good" && <Info size={14} />}
                    {evaluation.verdict} fit
                  </span>
                </div>
                
                {/* Fit Score */}
                <div className="flex sm:flex-col items-center gap-2 sm:gap-0 shrink-0">
                  <div className="relative h-20 w-20 sm:h-24 sm:w-24">
                    <svg className="h-20 w-20 sm:h-24 sm:w-24 -rotate-90">
                      <circle
                        cx="40"
                        cy="40"
                        r="32"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="6"
                        className="text-muted sm:hidden"
                      />
                      <motion.circle
                        cx="40"
                        cy="40"
                        r="32"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="6"
                        strokeLinecap="round"
                        className={cn(getScoreColor(evaluation.fitScore), "sm:hidden")}
                        strokeDasharray={`${evaluation.fitScore * 2.01} 201`}
                        initial={{ strokeDasharray: "0 201" }}
                        animate={{ strokeDasharray: `${evaluation.fitScore * 2.01} 201` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-muted hidden sm:block"
                      />
                      <motion.circle
                        cx="48"
                        cy="48"
                        r="40"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeLinecap="round"
                        className={cn(getScoreColor(evaluation.fitScore), "hidden sm:block")}
                        strokeDasharray={`${evaluation.fitScore * 2.51} 251`}
                        initial={{ strokeDasharray: "0 251" }}
                        animate={{ strokeDasharray: `${evaluation.fitScore * 2.51} 251` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={cn("font-display text-xl sm:text-2xl font-bold", getScoreColor(evaluation.fitScore))}>
                        {evaluation.fitScore}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground sm:mt-1 sm:text-center">Fit Score</p>
                </div>
              </div>

              {/* Insights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <h4 className="font-display text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Key Insights
                  </h4>
                  <ul className="space-y-2">
                    {evaluation.insights.map((insight, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + i * 0.1 }}
                        className="flex items-start gap-2 text-sm text-foreground"
                      >
                        <Sparkles size={14} className="text-primary mt-0.5 shrink-0" />
                        {insight}
                      </motion.li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-display text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Similar Users
                  </h4>
                  <p className="text-sm text-foreground bg-muted/50 rounded-xl p-3 sm:p-4">
                    {evaluation.similarUserFeedback}
                  </p>

                  {evaluation.ingredients.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-display text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        Key Ingredients
                      </h4>
                      <div className="space-y-2">
                        {evaluation.ingredients.map((ing, i) => (
                          <div key={i} className="flex items-center justify-between text-sm gap-2">
                            <span className="font-medium text-foreground">{ing.name}</span>
                            <span className={cn(
                              "text-xs truncate max-w-[150px]",
                              ing.concern ? "text-accent" : "text-muted-foreground"
                            )}>
                              {ing.concern || ing.benefit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Based on data from users with similar skin profiles. Saved to Your Products.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recent Evaluations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl p-4 sm:p-6 shadow-soft"
        >
          <h3 className="font-display text-base sm:text-lg font-semibold mb-4">Your Products</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {recentProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground col-span-full py-8 text-center">
                No products evaluated yet. Try evaluating a product above!
              </p>
            ) : (
              recentProducts.map((product, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="p-3 sm:p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                  onClick={() => handleProductClick(product)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn(
                      "text-lg font-display font-bold",
                      getScoreColor(product.fitScore)
                    )}>
                      {product.fitScore}
                    </span>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full capitalize",
                      getVerdictColor(product.verdict)
                    )}>
                      {product.verdict}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground line-clamp-2 break-words">
                    {product.name}
                  </p>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* Product Detail Modal */}
        <Dialog open={productModalOpen} onOpenChange={setProductModalOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto scrollbar-custom">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold break-words pr-8">
                {selectedProduct?.name}
              </DialogTitle>
            </DialogHeader>
            
            {selectedProduct && (
              <div className="space-y-6">
                {/* Score and Verdict */}
                <div className="flex items-center gap-4">
                  <div className="relative h-16 w-16">
                    <svg className="h-16 w-16 -rotate-90">
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        className="text-muted"
                      />
                      <motion.circle
                        cx="32"
                        cy="32"
                        r="28"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeLinecap="round"
                        className={cn(getScoreColor(selectedProduct.fitScore))}
                        strokeDasharray={`${selectedProduct.fitScore * 1.76} 176`}
                        initial={{ strokeDasharray: "0 176" }}
                        animate={{ strokeDasharray: `${selectedProduct.fitScore * 1.76} 176` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={cn("font-display text-lg font-bold", getScoreColor(selectedProduct.fitScore))}>
                        {selectedProduct.fitScore}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium capitalize",
                        getVerdictColor(selectedProduct.verdict)
                      )}
                    >
                      {selectedProduct.verdict === "great" && <Check size={14} />}
                      {selectedProduct.verdict === "caution" && <AlertTriangle size={14} />}
                      {selectedProduct.verdict === "good" && <Info size={14} />}
                      {selectedProduct.verdict} fit
                    </span>
                    <p className="text-sm text-muted-foreground mt-1">
                      Evaluated on {new Date(selectedProduct.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* AI Insights */}
                <div>
                  <h4 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    AI-Generated Insights
                  </h4>
                  <ul className="space-y-2">
                    {selectedProduct.insights.map((insight, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-start gap-2 text-sm text-foreground"
                      >
                        <Sparkles size={14} className="text-primary mt-0.5 shrink-0" />
                        {insight}
                      </motion.li>
                    ))}
                  </ul>
                </div>

                {/* Similar User Feedback */}
                <div>
                  <h4 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Similar User Feedback
                  </h4>
                  <p className="text-sm text-foreground bg-muted/50 rounded-xl p-4">
                    {selectedProduct.similarUserFeedback}
                  </p>
                </div>

                {/* Footer */}
                <div className="pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    This analysis was generated based on your skin profile and similar user experiences. Always patch test new products before full use.
                  </p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}