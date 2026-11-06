"""Package only source-controlled/eligible source, never runtime data or credentials."""
from pathlib import Path
import subprocess, zipfile
root=Path(__file__).resolve().parent.parent
out=root/'public'/'shadow-protocol-source.zip'
files=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z'],cwd=root).decode().split('\0')
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as archive:
    for name in sorted(set(files)):
        if not name or name=='public/shadow-protocol-source.zip': continue
        path=root/name
        if path.is_file(): archive.write(path,'shadow-protocol/'+name)
print(f'Source archive: {out.name} ({out.stat().st_size:,} bytes)')
