import json

def extract_first_json_object(text: str):
    """
    Robustly extracts the first JSON object from a string.
    Fixes cases where model returns JSON + extra text ("Extra data" error).
    """
    if not text:
        raise ValueError("Empty response")

    # strip code fences if present
    t = text.strip()
    if "```json" in t:
        t = t.split("```json", 1)[1]
        t = t.split("```", 1)[0].strip()
    elif "```" in t:
        t = t.split("```", 1)[1]
        t = t.split("```", 1)[0].strip()

    # find first balanced {...}
    start = t.find("{")
    if start < 0:
        raise ValueError("No JSON object start found")

    depth = 0
    in_str = False
    esc = False
    for i in range(start, len(t)):
        ch = t[i]
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
        else:
            if ch == '"':
                in_str = True
            elif ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    candidate = t[start:i+1]
                    return json.loads(candidate)

    raise ValueError("Unbalanced JSON braces")