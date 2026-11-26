import {expect,it} from '@rstest/core';
import {renderToStaticMarkup} from 'react-dom/server';
import {MODULE_OFF_COPY} from './module-off-copy';
import {ModuleOff} from './module-off';

it('pairs every module availability message in both languages',()=>{
 expect(Object.keys(MODULE_OFF_COPY.es).sort()).toEqual(Object.keys(MODULE_OFF_COPY.en).sort());
});

it('localizes the Updates availability screen without changing access or component classes',()=>{
 const english=renderToStaticMarkup(<ModuleOff module="updates" owner held/>);
 const spanish=renderToStaticMarkup(<ModuleOff module="updates" owner held lang="es"/>);
 expect(english).toContain('Company updates are coming in a later release');
 expect(spanish).toContain('Avisos de la empresa: próximamente');
 for(const markup of [english,spanish]){
  expect(markup).toContain('class="module-off"');
  expect(markup).toContain('data-module-off="updates"');
  expect(markup).toContain('href="/app"');
  expect(markup).not.toContain('/app/settings/features');
 }
 const manager=renderToStaticMarkup(<ModuleOff module="updates" owner={false} lang="es"/>);
 expect(manager).toContain('Tu empresa no usa avisos de la empresa en NEVORA ahora.');
 expect(manager).toContain('Pregúntale a tu gerente');
 expect(renderToStaticMarkup(<ModuleOff module="updates" workspaceName="Example" owner lang="es"/>))
  .toContain('href="/app/settings/features"');
});
