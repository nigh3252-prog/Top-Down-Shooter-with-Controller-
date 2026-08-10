import pathlib
d=pathlib.Path('.')
shell=(d/'src/shell.html').read_text()
three=(d/'three.iife.js').read_text()
app=(d/'src/app.js').read_text()
out=shell.replace('__THREE__', three).replace('__APP__', app)
p=d/'out'; p.mkdir(exist_ok=True)
f=p/'wizard-of-legend-star-bolt-and-shock-nova.html'
f.write_text(out)
print(f, len(out))
