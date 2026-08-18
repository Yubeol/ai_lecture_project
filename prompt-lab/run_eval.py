"""프롬프트 회귀 테스트.

사용법:
    python prompt-lab/run_eval.py                 # 전체 1회
    python prompt-lab/run_eval.py -n 3            # 케이스당 3회 (안정성 측정)
    python prompt-lab/run_eval.py --only sim_01   # 특정 케이스만
    python prompt-lab/run_eval.py --tag v2        # 결과 파일에 태그
"""
import argparse
import json
import os
import re
import statistics
import sys
import time
from datetime import datetime
from pathlib import Path

import yaml
from anthropic import Anthropic
from dotenv import load_dotenv
from rich.console import Console
from rich.table import Table

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))

from prompts import SYSTEM_PROMPT, USER_TEMPLATE  # noqa: E402
from schemas import validate_payload  # noqa: E402

load_dotenv(HERE / ".env")
load_dotenv(HERE.parent / ".env")

MODEL = "claude-sonnet-4-6"
MAX_TOKENS = 400
console = Console()
client = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

NUMBER_KEYS = {"score", "scores", "similarity", "similarities",
               "value", "values", "vector", "vectors", "percent"}


def extract_json(raw: str) -> tuple[dict | None, str, bool]:
    """(파싱된 객체, 실패사유, 오염여부)
    오염여부 = JSON 앞뒤로 백틱이나 설명 텍스트가 섞여 있었는지."""
    text = raw.strip()
    dirty = not (text.startswith("{") and text.endswith("}"))

    # 코드블록 껍데기 제거
    fence = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, re.DOTALL)
    if fence:
        text = fence.group(1).strip()

    try:
        return json.loads(text), "", dirty
    except json.JSONDecodeError:
        pass

    # 중괄호 균형을 세어 첫 완전한 객체만 잘라낸다
    depth, start, in_str, esc = 0, None, False, False
    for i, ch in enumerate(text):
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch == "{":
            if depth == 0:
                start = i
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0 and start is not None:
                try:
                    return json.loads(text[start:i + 1]), "", True
                except json.JSONDecodeError as e:
                    return None, f"JSON 파싱 실패: {e}", dirty
    return None, "완전한 JSON 객체 없음", dirty


def find_fabricated_numbers(obj: dict) -> list[str]:
    """모델이 지어낸 숫자 필드를 찾는다."""
    found = []

    def walk(node, path=""):
        if isinstance(node, dict):
            for k, v in node.items():
                p = f"{path}.{k}" if path else k
                if k.lower() in NUMBER_KEYS:
                    found.append(p)
                walk(v, p)
        elif isinstance(node, list):
            for i, v in enumerate(node):
                walk(v, f"{path}[{i}]")

    walk(obj)
    return found


def check_contrast(obj: dict) -> tuple[bool, str]:
    """pairs가 '첫 문장 고정 + 짝 변경' 대비 구조인지."""
    pairs = obj.get("pairs", [])
    if len(pairs) < 2:
        return False, "pairs 2쌍 미만이라 대비 없음"
    firsts = {p[0].strip() for p in pairs if len(p) == 2}
    if len(firsts) != 1:
        return False, "첫 문장이 고정되지 않음"
    return True, ""


def run_one(utterance: str) -> tuple[str, float, dict]:
    """(원문, 소요초, usage)"""
    t0 = time.perf_counter()
    resp = client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=SYSTEM_PROMPT,
        messages=[
            {"role": "user", "content": USER_TEMPLATE.format(utterance=utterance)},
        ],
    )
    elapsed = time.perf_counter() - t0
    text = "".join(b.text for b in resp.content if b.type == "text")
    usage = {"in": resp.usage.input_tokens, "out": resp.usage.output_tokens}
    return text, elapsed, usage


def evaluate(case: dict) -> dict:
    """케이스 1회 실행 및 판정."""
    result = {"id": case["id"], "expect": case["expect"],
              "ok": False, "got": None, "reason": "", "elapsed": 0.0,
              "payload": None, "usage": None, "dirty": False}
    try:
        raw, elapsed, usage = run_one(case["utterance"])
    except Exception as e:
        result["reason"] = f"API 호출 실패: {e}"
        return result

    result["elapsed"] = elapsed
    result["usage"] = usage

    obj, err, dirty = extract_json(raw)
    result["dirty"] = dirty
    if obj is None:
        result["reason"] = err
        result["payload"] = raw[:200]
        return result

    result["payload"] = obj
    result["got"] = obj.get("component")

    valid, msg, name = validate_payload(obj)
    if not valid:
        result["reason"] = msg
        return result

    if name != case["expect"]:
        result["reason"] = f"컴포넌트 불일치 (기대 {case['expect']})"
        return result

    if case.get("forbid_numbers"):
        bad = find_fabricated_numbers(obj)
        if bad:
            result["reason"] = f"숫자 지어냄: {', '.join(bad)}"
            return result

    if case.get("must_contrast"):
        ok, why = check_contrast(obj)
        if not ok:
            result["reason"] = why
            return result

    result["ok"] = True
    result["reason"] = "ok (본문 오염)" if dirty else "ok"
    return result


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("-n", "--runs", type=int, default=1, help="케이스당 반복 횟수")
    ap.add_argument("--only", type=str, default=None, help="특정 case id만")
    ap.add_argument("--tag", type=str, default="", help="결과 파일 태그")
    args = ap.parse_args()

    cases = yaml.safe_load((HERE / "cases.yaml").read_text(encoding="utf-8"))["cases"]
    if args.only:
        cases = [c for c in cases if c["id"] == args.only]
        if not cases:
            console.print(f"[red]케이스 없음: {args.only}")
            return

    total = len(cases) * args.runs
    console.print(f"[bold]{len(cases)}개 케이스 x {args.runs}회 = {total}회 실행[/bold]\n")

    all_results = []
    per_case = {}

    for case in cases:
        oks, times = [], []
        for r in range(args.runs):
            res = evaluate(case)
            all_results.append(res)
            oks.append(res["ok"])
            times.append(res["elapsed"])

            mark = "[green]PASS[/green]" if res["ok"] else "[red]FAIL[/red]"
            suffix = f" [dim]#{r+1}[/dim]" if args.runs > 1 else ""
            console.print(f"{mark} {case['id']}{suffix}  "
                          f"[dim]{res['elapsed']:.2f}s[/dim]  {res['reason']}")
            if not res["ok"] and res["payload"] is not None:
                console.print(f"     [dim]{str(res['payload'])[:160]}[/dim]")

        per_case[case["id"]] = {
            "pass": sum(oks), "runs": args.runs,
            "avg_time": statistics.mean(times) if times else 0.0,
            "expect": case["expect"],
        }

    # ---- 요약 ----
    console.print()
    table = Table(title="요약")
    table.add_column("case")
    table.add_column("expect")
    table.add_column("통과", justify="right")
    table.add_column("평균(s)", justify="right")

    for cid, s in per_case.items():
        rate = s["pass"] / s["runs"]
        color = "green" if rate == 1 else ("yellow" if rate >= 0.5 else "red")
        table.add_row(cid, s["expect"],
                      f"[{color}]{s['pass']}/{s['runs']}[/{color}]",
                      f"{s['avg_time']:.2f}")
    console.print(table)

    passed = sum(r["ok"] for r in all_results)
    dirty = sum(r["dirty"] for r in all_results)
    times = [r["elapsed"] for r in all_results if r["elapsed"] > 0]
    tin = sum(r["usage"]["in"] for r in all_results if r["usage"])
    tout = sum(r["usage"]["out"] for r in all_results if r["usage"])

    console.print(f"\n[bold]통과율 {passed}/{len(all_results)} "
                  f"({passed / len(all_results) * 100:.1f}%)[/bold]")
    console.print(f"본문 오염(JSON 외 텍스트 섞임) {dirty}/{len(all_results)}")
    if times:
        console.print(f"응답 시간  평균 {statistics.mean(times):.2f}s / "
                      f"중앙 {statistics.median(times):.2f}s / "
                      f"최대 {max(times):.2f}s")
    console.print(f"토큰  in {tin:,} / out {tout:,}")

    # ---- 저장 ----
    outdir = HERE / "results"
    outdir.mkdir(exist_ok=True)
    stamp = datetime.now().strftime("%m%d_%H%M")
    name = f"{stamp}_{args.tag}.json" if args.tag else f"{stamp}.json"
    (outdir / name).write_text(
        json.dumps({"summary": per_case, "results": all_results},
                   ensure_ascii=False, indent=2, default=str),
        encoding="utf-8")
    console.print(f"[dim]→ results/{name}[/dim]")


if __name__ == "__main__":
    main()