import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const moduleUrl=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const mockUrl=moduleUrl(fs.readFileSync(path.join(root,'src/mock/uc2.js'),'utf8'));
const {uc2Rules}=await import(mockUrl);
const modelSource=fs.readFileSync(path.join(root,'src/views/uc2-canvas/rule-detail-model.js'),'utf8').replace('../../mock/uc2.js',mockUrl);
const {samplesFor,evidenceFor}=await import(moduleUrl(modelSource));
let pairs=0;
for(const rule of uc2Rules){
 const devices=samplesFor(rule);
 assert.equal(devices.length,rule.scope,rule.id+' sample scope');
 assert.equal(new Set(devices.map(device=>device.id)).size,devices.length,rule.id+' unique devices');
 assert.equal(devices.filter(device=>device.bad).length,rule.deviations,rule.id+' deviation count');
 assert.equal(devices.filter(device=>!device.bad).length,rule.support,rule.id+' supporting count');
 for(const device of devices){
  const evidence=evidenceFor(rule,device);
  assert.equal(evidence.ruleId,rule.id);
  assert.equal(evidence.deviceId,device.id);
  assert.equal(evidence.anomalyCount,device.bad?1:0);
  assert.ok(evidence.anomalyCount<=1,'A single-rule device result cannot contain another rule.');
  assert.ok(evidence.expected.length>0);
  pairs++;
 }
}
console.log(`PASS: ${uc2Rules.length} candidates, ${pairs} rule-device pairs; exactly one scoped result per device, with 0 or 1 anomaly.`);
