#!/usr/bin/env python3
"""nomu-oneQ-skill.V — Skill Validation Test

검증 항목:
  1. SKILL.md frontmatter (name/description/when_to_use)
  2. calculator.py CLI 실행 가능
  3. 시나리오별 계산 정확도

Usage:
  python3 tests/test_skill_validation.py
"""

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKILLS_DIR = ROOT / "skills"


def check_frontmatter(skill_dir: Path) -> tuple[bool, str]:
    md = skill_dir / "SKILL.md"
    if not md.exists():
        return False, f"SKILL.md missing in {skill_dir.name}"
    text = md.read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?)\n---", text, re.DOTALL)
    if not m:
        return False, f"{skill_dir.name}: no frontmatter"
    fm = m.group(1)
    for key in ("name:", "description:", "when_to_use:"):
        if key not in fm:
            return False, f"{skill_dir.name}: missing {key}"
    return True, ""


def run_calculator(skill: str, args: list[str]) -> dict:
    cli = SKILLS_DIR / skill / "references" / "calculator.py"
    proc = subprocess.run(
        ["python3", str(cli)] + args,
        capture_output=True, text=True, timeout=10,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"{skill} CLI failed: {proc.stderr}")
    return json.loads(proc.stdout)


SCENARIOS = [
    {
        "id": "S-01",
        "skill": "severance-pay",
        "args": ["simple", "--avg-monthly-wage", "3500000", "--years", "5"],
        "assert": lambda r: r["eligible"] and r["final_severance"] == 17500000,
        "desc": "간이: 월350만 × 5년 = 1750만",
    },
    {
        "id": "S-02",
        "skill": "severance-pay",
        "args": ["simple", "--avg-monthly-wage", "3000000", "--years", "0", "--months", "11"],
        "assert": lambda r: not r["eligible"],
        "desc": "1년 미만 → 청구권 없음",
    },
    {
        "id": "S-03",
        "skill": "severance-pay",
        "args": [
            "calculate",
            "--avg-3month-wage-total", "10500000",
            "--days-in-3month", "92",
            "--total-service-days", "1825",
        ],
        "assert": lambda r: r["eligible"] and 16500000 < r["final_severance"] < 17500000,
        "desc": "정확: 3개월 1050만/92일 × 5년 ≈ 17백만",
    },
    {
        "id": "S-04",
        "skill": "severance-pay",
        "args": [
            "calculate",
            "--avg-3month-wage-total", "12000000",
            "--days-in-3month", "90",
            "--annual-bonus", "8000000",
            "--total-service-days", "3650",
            "--prior-settlement", "20000000",
        ],
        "assert": lambda r: r["eligible"] and r["prior_settlement"] == 20000000,
        "desc": "중간정산 공제 적용",
    },
]


def main():
    print(f"\n{'='*60}\nnomu-oneQ-skill.V — Skill Validation\n{'='*60}\n")
    pass_count = fail_count = 0

    print("[1] Frontmatter checks:")
    for skill_dir in sorted(SKILLS_DIR.iterdir()):
        if not skill_dir.is_dir():
            continue
        ok, msg = check_frontmatter(skill_dir)
        if ok:
            print(f"  ✅ {skill_dir.name}")
            pass_count += 1
        else:
            print(f"  ❌ {msg}")
            fail_count += 1

    print(f"\n[2] Scenario tests ({len(SCENARIOS)}):")
    for sc in SCENARIOS:
        try:
            result = run_calculator(sc["skill"], sc["args"])
            ok = sc["assert"](result)
        except Exception as e:
            ok = False
            result = {"error": str(e)}
        if ok:
            print(f"  ✅ {sc['id']} {sc['desc']}")
            pass_count += 1
        else:
            print(f"  ❌ {sc['id']} {sc['desc']}\n     → {result}")
            fail_count += 1

    total = pass_count + fail_count
    print(f"\n{'='*60}\nResult: {pass_count}/{total} PASS ({fail_count} FAIL)\n{'='*60}\n")
    return 0 if fail_count == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
