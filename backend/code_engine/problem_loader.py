import json
import os


def load_problems():
    """
    Load coding problems from JSON file (200 problems with test cases)
    Returns a list of problem dictionaries
    """
    try:
        json_path = os.path.join(
            os.path.dirname(__file__),
            "problems_200_with_testcases.json"
        )
        sample_path = os.path.join(
            os.path.dirname(__file__),
            "sample_problems.json"
        )
        
        final_path = json_path
        if os.path.exists(json_path):
            final_path = json_path
            print(f"✅ Loaded USER PROVIDED problems from {json_path}")
        elif os.path.exists(sample_path):
            final_path = sample_path
            print(f"✅ Loaded sample problems from {sample_path}")
        else:
            raise FileNotFoundError(
                f"❌ Problems JSON file not found"
            )

        with open(final_path, "r", encoding="utf-8") as f:
            problems = json.load(f)

        print(f"✅ Loaded {len(problems)} problems WITH test cases")

        # Debug check (safe to keep)
        if problems and "test_cases" in problems[0]:
            print("✅ Test cases detected in problems")
        else:
            print("⚠️ Warning: test_cases field missing")

        return problems

    except Exception as e:
        print(f"❌ Fatal error loading problems: {e}")
        raise e
