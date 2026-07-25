export function textConfigurationSystemPrompt() {
  return [
    "You extract hospital scheduling admin configuration intent from Czech or English text.",
    "Return only the fields requested by the JSON schema.",
    "Use null when the user is unclear or when a value is not stated.",
    "Do not invent hospital names, worker counts, export modules, or generator rules.",
    "Supported exportModule values: EGJE only.",
    "Map phrases like JIP/ICU, Emergency/ER, Surgery/Chirurgie, Cardiology/Kardio to department context when present.",
    "For night-shift wording, maxConsecutiveNights means the maximum allowed consecutive night shifts after applying the rule.",
  ].join(" ");
}

export function textConfigurationUserPrompt(input: string) {
  return [
    "Extract structured intent for this admin request:",
    input,
  ].join("\n\n");
}
