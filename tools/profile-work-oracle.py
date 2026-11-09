"""Freeze an independent numeric oracle from the supplied Work renderer.

python tools/profile-work-oracle.py /path/to/extracted/prototype
Requires the Work package's NumPy/SciPy/Pillow, never application dependencies.
Only Gold P and Portra P are rendered; no photograph is needed or published.
"""
import hashlib
import importlib.util
import json
from pathlib import Path
import sys

root = Path(__file__).resolve().parents[1]
source = Path(sys.argv[1]).resolve()
expected = {
    'render.py': 'f02823ddf840c9ed76c9d5f71a4bee6948bfacc0ff242a86a060a5dfbe91da55',
    'catalog.json': '2d8df4945467facffc3a20bf37e6bfbe667e67f2cdf7fdb84cd82223de95552e',
}
for name, digest in expected.items():
    if hashlib.sha256((source / name).read_bytes()).hexdigest() != digest:
        raise ValueError('Not the supplied Work source: ' + name)
spec = importlib.util.spec_from_file_location('work_renderer', source / 'render.py')
work = importlib.util.module_from_spec(spec)
spec.loader.exec_module(work)
np = work.np
# Corners, edges, grays, exact tone knots, synthetic skin and reproducible colors.
axis = np.linspace(0, 1, 5)
gray = np.r_[np.linspace(0, 1, 33), work.encode(np.array(work.TONE) ** 3)]
patches = json.loads((root / 'docs/profile-system/work/FILMLABB_3_Profile_Library.json').read_text())['tests']['synthetic_patch_input']
samples = np.concatenate([
    np.stack(np.meshgrid(axis, axis, axis, indexing='ij'), axis=-1).reshape(-1, 3),
    np.random.default_rng(311).random((128, 3)),
    np.repeat(gray[:, None], 3, axis=1),
    np.array([p['sRGB'] for p in patches]),
])
profiles = {'film.kodak-gold-200': work.P, 'film.kodak-portra-400': work.R}
fields = ['tone', 'hue', 'chroma', 'shadow', 'highlight', 'skinPass']
report = {
    'source': 'FILMLABB_Codex_Profiler_Litet_Paket.zip / prototype',
    'sourceSHA256': expected,
    'domain': 'encoded sRGB D65 [0,1], full strength, float64; lower strengths mix once in encoded sRGB',
    'seed': 311,
    'columns': ['input'] + list(profiles),
    'parameters': {id: {k: p[k] for k in fields} for id, p in profiles.items()},
    'samples': np.stack([samples] + [work.transform(samples, p) for p in profiles.values()], axis=1).round(15).tolist(),
}
target = root / 'tests/fixtures/work-parametric-oracle.json'
target.write_text(json.dumps(report, separators=(',', ':')) + '\n')
print('Work P oracle:', len(samples), 'samples per profile;', target)
