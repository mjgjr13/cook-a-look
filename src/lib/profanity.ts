// Profanity filter used by forms across the site for a friendly, immediate
// message. The database enforces the same list (public.contains_profanity,
// migration 20261007120000), so keep the two patterns in sync.
//
// Whole-word matching only, so ordinary words like "cocktail", "Scunthorpe"
// or "assess" are not blocked.
const PATTERN =
  /\b(f+[u*@]+c+k\w*|motherf\w*|sh[i1!]+t(s|ty|head\w*)?|b[i1!]tch(es|y)?|c+u+n+t\w*|assholes?|arseholes?|bastards?|dick(s|head\w*)?|puss(y|ies)|cock(s|sucker\w*)?|sluts?|whores?|fag(s|got\w*)?|nigg(er|a)\w*|retard(ed|s)?|twats?|wank\w*|pricks?|bollocks|dumbass\w*|jackass\w*)\b/i;

export const containsProfanity = (...values: (string | null | undefined)[]): boolean =>
  values.some((v) => !!v && PATTERN.test(v));

export const PROFANITY_MESSAGE = "Please remove offensive language and try again.";

/** True when a database error came from the profanity check. */
export const isProfanityError = (message?: string | null): boolean =>
  !!message && /offensive language|profanity_not_allowed/i.test(message);
