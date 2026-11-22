from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

def build(root: Path) -> None:
    root = root.resolve()
    sys.path.insert(0, str(root / 'data-pipeline'))
    from pipeline.model.frontier_evidence import validate_frontier_evaluation_summary

    source = root / 'notebooks/data/frontier-evaluation-summary.json'
    data = json.loads(source.read_text(encoding='utf-8'))
    audit = validate_frontier_evaluation_summary(data)
    synthetic = data['synthetic_cases']
    product = [row for row in data['product_cases'] if row['status'] in {'partial', 'complete'}]
    synthetic_summary = data['synthetic_summary']
    paired_interval = synthetic_summary['frontier_minus_classical_normalized_npv_seed_clustered_interval']
    differences = [row['frontier_minus_classical_normalized_npv'] for row in synthetic]
    mean_difference = sum(differences) / len(differences)
    wins = sum(row['normalized_npv'] > row['classical_normalized_npv'] for row in synthetic)

    def product_wins(method: str) -> tuple[int, int]:
        comparisons = [
            pair for row in product for pair in row['paired_baseline_methods']
            if pair['method'] == method
        ]
        return sum(pair['frontier_minus_baseline_npv'] > 0 for pair in comparisons), len(comparisons)

    greedy_wins, greedy_n = product_wins('toposort-greedy')
    expected_wins, expected_n = product_wins('toposort-expected')
    local_wins, local_n = product_wins('cpitD-local-search')
    ss = synthetic_summary
    rows = [
        ('Synthetic test', str(len(synthetic)), f"{ss['partial']} partial; {ss['failed']} failed",
         f"{ss['mean_normalized_npv_feasible']:.6f}", f"{ss['median_normalized_npv_feasible']:.3f}",
         f"{mean_difference:.3f} [{paired_interval['lower']:.3f}, {paired_interval['upper']:.3f}]",
         f"{wins}/{len(synthetic)}"),
        ('Product cases', str(len(data['product_cases'])),
         f"{data['product_summary']['partial']} partial; {data['product_summary']['failed']} failed",
         'not pooled', 'not pooled',
         f"greedy {greedy_wins}/{greedy_n}; exact ExTS {expected_wins}/{expected_n}; local search {local_wins}/{local_n}",
         'fixed cases'),
    ]
    table = [
        '% Generated from notebooks/data/frontier-evaluation-summary.json after contract validation.',
        f"% Retained case audit: {audit}",
        r'\begin{table}[ht]',
        r'\centering\scriptsize',
        r'\setlength{\tabcolsep}{1.75pt}',
        r'\caption{Measured outcomes by evaluation set. Synthetic paired differences are frontier minus greedy TopoSort, with a 95\% seed-cluster interval; product win counts are descriptive over supported fixed cases.}',
        r'\label{tab:frontier-measured-summary}',
        r'\begin{tabular}{>{\raggedright\arraybackslash}p{0.10\textwidth}r>{\raggedright\arraybackslash}p{0.15\textwidth}rr>{\raggedright\arraybackslash}p{0.37\textwidth}r}',
        r'\toprule Set & $n$ & Status & Mean NPV & Median NPV & Paired comparison & Wins \\',
        r'\midrule',
    ]
    for row in rows:
        table.append(' & '.join(row) + r' \\')
    table += [
        r'\bottomrule',
        r'\end{tabular}',
        r'\vspace{2pt}',
        r'\parbox{0.98\linewidth}{\footnotesize Synthetic statistics use all 500 cases. Product counts cover 11 scored cases; fixed-case counts are descriptive, not a population estimate.}',
        r'\end{table}',
    ]
    out = root / 'manuscripts/state-conditioned-frontier-policy/generated_frontier_summary.tex'
    out.write_text('\n'.join(table) + '\n', encoding='utf-8', newline='\n')
    print(f'Wrote {out.relative_to(root)} from {len(synthetic)} synthetic rows and {len(data["product_cases"])} product rows; audit={audit}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    build(parser.parse_args().root)
