"""Exercise real artifact publication and a recipient's checksum verification."""
from pathlib import Path
import json,os,shutil,struct,subprocess,sys,tempfile,unittest,zipfile

TOOL=Path(__file__).with_name('ci-artifacts.py')

class ArtifactCustodyTests(unittest.TestCase):
    def setUp(self):
        self.temporary=tempfile.TemporaryDirectory();self.addCleanup(self.temporary.cleanup)
        self.root=Path(self.temporary.name).resolve();self.repo=self.root/'repo';self.repo.mkdir()
        self.git('init','-q');self.git('config','user.name','Fictional CI');self.git('config','user.email','ci@example.invalid')
        (self.repo/'source.txt').write_text('committed source\n');self.git('add','source.txt');self.git('commit','-qm','fixture')
        self.expected=self.git('rev-parse','HEAD').stdout.strip()
        self.build=self.root/'build';self.output=self.root/'published'
        self.apk=self.build/'outputs/apk/release/app-release-unsigned.apk';self.aab=self.build/'outputs/bundle/release/app-release.aab'
        self.archive(self.apk,{'AndroidManifest.xml':b'fictional manifest','classes.dex':b'fictional DEX'})
        self.archive(self.aab,{'BundleConfig.pb':b'fictional config','base/manifest/AndroidManifest.xml':b'fictional manifest','base/dex/classes.dex':b'fictional DEX'})
    def git(self,*args):return subprocess.run(['git',*args],cwd=self.repo,capture_output=True,text=True,check=True)
    def archive(self,path,entries):
        path.parent.mkdir(parents=True,exist_ok=True)
        with zipfile.ZipFile(path,'w') as z:
            for name,value in entries.items():z.writestr(name,value)
    def run_tool(self,expected=None):
        return subprocess.run([sys.executable,str(TOOL),'--repo',str(self.repo),'--expected-sha',expected or self.expected,'--build-dir',str(self.build),'--output-directory',str(self.output)],capture_output=True,text=True)
    def refused(self,reason):
        result=self.run_tool();self.assertEqual(result.returncode,1,result.stderr)
        self.assertEqual(json.loads(result.stdout)['reason'],reason)
        self.assertFalse(self.output.exists());self.assertEqual(list(self.root.glob('.native-artifact-*')),[])
    def test_valid_outputs_verify_after_download_without_original_paths(self):
        result=self.run_tool();self.assertEqual(result.returncode,0,result.stderr)
        self.assertEqual({p.name for p in self.output.iterdir()},{'app-release-unsigned.apk','app-release.aab','source-sha.txt','artifacts.sha256','custody.json'})
        self.assertEqual((self.output/'source-sha.txt').read_text(),self.expected+'\n')
        downloaded=self.root/'downloaded';shutil.copytree(self.output,downloaded)
        self.build.rename(self.root/'build-offline');self.output.rename(self.root/'published-offline')
        checked=subprocess.run(['shasum','-a','256','-c','artifacts.sha256'],cwd=downloaded,capture_output=True,text=True)
        self.assertEqual(checked.returncode,0,checked.stdout+checked.stderr)
    def test_missing_unsigned_apk_cannot_publish_leftover_release_files(self):
        self.apk.rename(self.apk.with_name('app-release.apk'));self.refused('missing')
    def test_dirty_source_cannot_publish_existing_binaries(self):
        (self.repo/'source.txt').write_text('changed source\n');self.refused('source')
    def test_python_cache_is_kept_outside_source_without_excusing_dirty_files(self):
        module=self.repo/'owned_fixture.py';module.write_text('VALUE = 1\n')
        self.git('add',module.name);self.git('commit','-qm','Python source fixture')
        self.expected=self.git('rev-parse','HEAD').stdout.strip()
        # Reproduce Linux's default cache placement even on macOS, whose Python
        # redirects bytecode to a user cache. Custody must reject that dirt.
        subprocess.run([sys.executable,'-c','import sys;sys.pycache_prefix=None;import owned_fixture'],cwd=self.repo,check=True)
        self.assertTrue((self.repo/'__pycache__').is_dir());self.refused('source')
        shutil.rmtree(self.repo/'__pycache__')
        # Match CI's external bytecode destination, keeping the clean-source
        # assertion intact rather than ignoring generated paths in the guard.
        cache=self.root/'python-cache'
        subprocess.run([sys.executable,'-c','import owned_fixture'],cwd=self.repo,env={**os.environ,'PYTHONPYCACHEPREFIX':str(cache)},check=True)
        self.assertTrue(list(cache.rglob('owned_fixture.*.pyc')))
        self.assertFalse((self.repo/'__pycache__').exists())
        result=self.run_tool();self.assertEqual(result.returncode,0,result.stderr)
    def test_wrong_head_cannot_publish(self):
        result=self.run_tool('0'*40);self.assertEqual(result.returncode,1)
        self.assertEqual(json.loads(result.stdout)['reason'],'source');self.assertFalse(self.output.exists())
    def test_jar_signed_apk_and_aab_are_not_unsigned_artifacts(self):
        for path in [self.apk,self.aab]:
            with self.subTest(path=path.name):
                original=path.read_bytes()
                with zipfile.ZipFile(path,'a') as z:z.writestr('META-INF/FIXTURE.RSA',b'fictional signature')
                self.refused('signed');path.write_bytes(original)
    def test_apk_signing_block_is_not_published_as_unsigned(self):
        data=bytearray(self.apk.read_bytes());end=data.rfind(b'PK\x05\x06');central=struct.unpack_from('<I',data,end+16)[0]
        block=struct.pack('<QQ',24,24)+b'APK Sig Block 42'
        data[central:central]=block;struct.pack_into('<I',data,end+len(block)+16,central+len(block));self.apk.write_bytes(data)
        self.refused('signed')
    def test_symlink_input_cannot_be_published(self):
        actual=self.root/'other.apk';self.apk.rename(actual);self.apk.symlink_to(actual);self.refused('input')
    def test_existing_destination_is_preserved(self):
        self.output.mkdir();marker=self.output/'owner.txt';marker.write_text('keep this\n')
        result=self.run_tool();self.assertEqual(result.returncode,1)
        self.assertEqual(json.loads(result.stdout)['reason'],'destination');self.assertEqual(marker.read_text(),'keep this\n')

if __name__=='__main__':unittest.main()
