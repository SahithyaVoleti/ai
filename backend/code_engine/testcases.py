import json

with open("problems_200.json", "r", encoding="utf-8") as f:
    problems = json.load(f)

for p in problems:
    p["type"] = "function"
    p["function_name"] = p["title"].lower().replace(" ", "_").replace("'", "")
    p["input_format"] = "auto"
    p["output_format"] = "auto"

    # very basic default test cases
    p["test_cases"] = [
        {
            "input": [1, 2],
            "output": 3,
            "visibility": "public"
        },
        {
            "input": [5, 7],
            "output": 12,
            "visibility": "hidden"
        }
    ]

with open("problems_200_with_testcases.json", "w", encoding="utf-8") as f:
    json.dump(problems, f, indent=2)

print("✅ Test cases added to all 200 problems")
