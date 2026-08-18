"""데모 시나리오를 미리 생성해 캐시로 만든다.

사용법:
    python prompt-lab/build_cache.py           # 생성 + 검토용 출력
    python prompt-lab/build_cache.py --write   # frontend 캐시 파일까지 기록
"""
import argparse
import json
import sys
from pathlib import Path

import yaml
from rich.console import Console

HERE = Path(__file__).parent
ROOT = HERE.parent
sys.path.insert(0, str(ROOT / "backend"))

from app.services.generator import generate  # noqa: E402

console = Console()
OUT_JSON = ROOT / "frontend" / "src" / "fixtures" / "scenario.json"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true", help="프론트 캐시 파일 기록")
    args = ap.parse_args()

    steps = yaml.safe_load(
        (HERE / "scenario.yaml").read_text(encoding="utf-8")
    )["scenario"]

    cache = {}
    problems = []

    for st in steps:
        res = generate(st["utterance"])
        got = res["payload"]["component"] if res["ok"] else "none"
        ok = got == st["expect"]

        mark = "[green]OK  [/green]" if ok else "[red]MISS[/red]"
        console.print(f"{mark} {st['id']}  {st['expect']:16} → {got}")
        console.print(f"     [dim]{st['utterance']}[/dim]")

        if res["ok"]:
            p = res["payload"]
            cache[st["utterance"]] = p
            console.print(f"     [cyan]{p.get('title', '')}[/cyan]")

            # 사람이 눈으로 확인해야 할 내용을 뽑아준다
            if p["component"] == "SimilarityGauge":
                for d in p["data"]:
                    console.print(f"       {d['score']:>7.3f}  {d['a']} ↔ {d['b']}")
                scores = [d["score"] for d in p["data"]]
                if max(scores) - min(scores) < 0.35:
                    problems.append(f"{st['id']}: 점수 대비가 약함 ({scores})")

            elif p["component"] == "VectorBars":
                for d in p["data"]:
                    console.print(f"       {d['sentence']}")

            elif p["component"] == "Scatter2D":
                for d in p["data"]:
                    console.print(f"       ({d['x']:>6.2f}, {d['y']:>6.2f})  {d['sentence']}")
                longest = max(len(d["sentence"]) for d in p["data"])
                if longest > 20:
                    problems.append(f"{st['id']}: 문장 {longest}자 — 라벨 겹칠 수 있음")
                if len(p["data"]) > 6:
                    problems.append(f"{st['id']}: 점 {len(p['data'])}개 — 너무 많음")

            console.print(f"     [dim]{p.get('caption', '')}[/dim]")
        else:
            console.print(f"     [dim]skip: {res['reason']}[/dim]")

        if not ok:
            problems.append(f"{st['id']}: {st['expect']} 기대했으나 {got}")

        console.print()

    # ---- 요약 ----
    if problems:
        console.print("[bold red]확인 필요[/bold red]")
        for p in problems:
            console.print(f"  · {p}")
    else:
        console.print("[bold green]시나리오 전체 정상[/bold green]")

    if args.write:
        OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
        OUT_JSON.write_text(
            json.dumps(cache, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        console.print(f"\n[dim]→ {OUT_JSON.relative_to(ROOT)}  ({len(cache)}건)[/dim]")
    else:
        console.print("\n[dim]--write 를 붙이면 프론트 캐시 파일에 기록합니다[/dim]")


if __name__ == "__main__":
    main()