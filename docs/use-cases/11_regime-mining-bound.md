# 11 · Mining-bound regime (`regime-mining-bound`)

**Family:** `regime`. **Role in the argument**, as the case source states it:

> The fleet binds and the plant idles: the mirror image, and a different pit shape.

## The instance

- **deposit**: seeded `porphyry` twin, 24 x 24 x 12 = 6,912 blocks, seed 7, 45-degree slopes
- **data**: synthetic, license-free; the per-block schedule ships to the browser
- **scenario**: 12 periods at a rate of 0.10, first period undiscounted; capacity mining 0.45, processing 0.90 of the pit's per-period resource

## The fleet binds and the plant idles

The mirror image: twelve periods at ten percent with mining capacity 0.45 and plant capacity 0.90. A
different pit shape, because tonnes moved, not tonnes processed, are what each period can afford.

## A sanity check on the destination bound

With the fleet as the bottleneck, Lane's cutoff is break-even: ore and waste consume a mining hour alike, so
the opportunity cost cancels and choosing destinations should be worth nothing. The PCPSP LP must then equal
the CPIT bound, and in the bounds table it does; the destination rungs end at or near the best CPIT plan.

## Bounds

<!-- generated:case-bounds:regime-mining-bound -->
| bound | value | time | detail |
| --- | ---: | ---: | --- |
| ultimate pit (UPIT, exact, undiscounted) | 473,615,066 |  | 4,621 of 6,912 blocks; no time, no capacity |
| Algorithm 4 (min over single-resource LPs) | 187,991,036 | 22.3 s | 247 maximum closures |
| joint LP (Bienstock-Zuckerberg) | 187,991,077 | 12.4 s | 17 iterations on 82,944 nodes, 722,832 edges; slack of Algorithm 4: none (BZ ended 0.22 ppm above, inside its tolerance) |
| PCPSP LP (HiGHS, destinations free) | 187,991,036 | 51.7 min | 805,800 rows, status optimal |
| used for every CPIT gap on this case | Algorithm 4 |  |  |
<!-- /generated -->

## Every method on this case

The best plan is marked; destination plans are measured against the PCPSP LP, every other plan against the
CPIT bound the case uses. Coherence is the mean over periods of the connected components and the share of
the largest one.

<!-- generated:case:regime-mining-bound -->
| method | rung | NPV | measured against | gap | time | components / largest share (mean per period) |
| --- | --- | ---: | --- | ---: | ---: | --- |
| `bench-by-bench` | classical | 46,282,695 | Algorithm 4 | 75.38% | 82 ms | 1.2 / 94% |
| `nested-shells` | classical | 84,693,369 | Algorithm 4 | 54.95% | 80 ms | 9.1 / 53% |
| `toposort-greedy` | classical | 80,886,097 | Algorithm 4 | 56.97% | 81 ms | 12.9 / 67% |
| `toposort-gershon` | classical | 135,904,818 | Algorithm 4 | 27.71% | 281 ms | 62.2 / 29% |
| `toposort-expected` | sota | 173,833,945 | Algorithm 4 | 7.53% | 22.4 s | 5.4 / 77% |
| `exts-two-resource` | sota | 173,936,548 | Algorithm 4 | 7.48% | 22.5 s | 4.3 / 78% |
| `shift-local-search` | sota | 173,936,548 | Algorithm 4 | 7.48% | 40 ms | 4.3 / 78% |
| `sliding-window` **(best)** | sota | 182,955,949 | Algorithm 4 | 2.68% | 3.8 min | 16.4 / 45% |
| `cpitD-local-search` | sota | 173,959,432 | Algorithm 4 | 7.46% | 1.2 s | 5.2 / 78% |
| `learned-expected-time` | learned | 155,736,136 | Algorithm 4 | 17.16% | 114 ms | 59.0 / 38% |
| `destination-toposort` | beyond | 173,833,945 | PCPSP LP | 7.53% | 24.7 s | 5.4 / 77% |
| `destination-sliding-window` | beyond | 182,955,949 | PCPSP LP | 2.68% | 4.2 min | 16.4 / 45% |
| `destination-local-search` | beyond | 182,965,952 | PCPSP LP | 2.67% | 2.1 s | 16.6 / 45% |
| `min-width` | beyond | 182,955,949 | Algorithm 4 | 2.68% | 96 ms | 16.4 / 45% |
<!-- /generated -->

*Tables generated from `data/derived/manifests/regime-mining-bound.json` by `scripts/docs_tables.py`.*
