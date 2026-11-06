import pathlib,time,subprocess,sys
root=pathlib.Path(__file__).resolve().parent.parent
for n in [int(v) for v in sys.argv[2].split(',')]:
 marker=root/'results'/f'{n:02d}_{"decode" if sys.argv[1]=="analyze" else "analysis"}.json'
 while not marker.exists():time.sleep(3)
 cmd=['node','experiment/analyze.mjs',str(n)] if sys.argv[1]=='analyze' else ['python','experiment/experiments.py',str(n)]
 subprocess.run(cmd,cwd=root,check=True)
