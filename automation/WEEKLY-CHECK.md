# 5-Minute Weekly Visibility Check

1. Search Console -> Performance: note total impressions + clicks for the last
   7 days vs previous 7. Impressions rising = rankings forming, even at 0 clicks.
2. Same screen, Queries tab: any new query containing "ai sales agent",
   "ai phone agent", "ai operating system", or "san diego"? Those are the
   money terms arriving.
3. Search Console -> Pages: indexed count should climb weekly as blog posts
   accumulate. Bulk "Crawled - currently not indexed" on blog posts = flag it.
4. GA4 -> Reports -> Engagement -> Landing pages: which blog posts bring
   visitors, and do any sessions continue to a service page or /contact?
5. Monthly (automated): automation/visibility_check.py writes the LLM report
   to automation/visibility/. Watch the score climb from the 1/10 baseline.
