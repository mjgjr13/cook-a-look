/**
 * "Top advisor" ordering used for Recommended sort and the homepage's
 * Featured advisors: real advisors before sample profiles, then advisors with
 * real reviews by average rating, then by number of reviews.
 */
export const compareTopAdvisors = (
  a: { isSample?: boolean; rating?: number | null; review_count?: number | null },
  b: { isSample?: boolean; rating?: number | null; review_count?: number | null },
): number => {
  if (!!a.isSample !== !!b.isSample) return a.isSample ? 1 : -1;
  const aReviews = a.review_count || 0;
  const bReviews = b.review_count || 0;
  if ((aReviews > 0) !== (bReviews > 0)) return aReviews > 0 ? -1 : 1;
  const byRating = (b.rating || 0) - (a.rating || 0);
  if (byRating !== 0) return byRating;
  return bReviews - aReviews;
};
