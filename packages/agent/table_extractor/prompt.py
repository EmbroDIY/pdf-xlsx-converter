"""Prompt builder for table extraction from PDF images."""


def build_extraction_prompt(
    headers: list[str],
    header_marker: str,
    stop_marker: str = "",
) -> str:
    """Build the extraction prompt for the vision model."""
    cols = " | ".join(headers)
    num = len(headers)

    prompt = f"""Extract the tabular data from this document image.

The table has {num} columns with these headers (in order):
{cols}

Rules:
- The table starts after the line containing "{header_marker}".
"""
    if stop_marker:
        prompt += f'- The table ends at the line containing "{stop_marker}".\n'

    prompt += (
        f"- Return ONLY a JSON array of arrays. Each inner array is one row with exactly {num} string values.\n"
        "- Preserve the exact order of columns.\n"
        '- If a cell is empty, use an empty string "".\n'
        "- Do NOT include the header row itself in the output.\n"
        "- Do NOT include any text outside the JSON array.\n"
        '- Numbers should be kept as strings exactly as they appear (e.g. "1.234,56" not "1234.56").\n'
    )

    return prompt
