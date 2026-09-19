const GIT_SHA = /^[0-9a-f]{40}$/;
const BOUNDED_ID = /^[A-Za-z0-9._:-]{1,160}$/;
export const ALOS_PROJECT = "missedcall-rescue-ai";
export const ALOS_REPOSITORY = "Gagan8atwal/missedcall-rescue-ai";
export const ALOS_EXPECTED_SOURCE_BRANCH = "alos/shared-agent-browser-integration-20260919";
export const ALOS_ADMISSION_SCHEMA = "alos.project-browser-admission.v1";
export const ALOS_OWNER_RESULT_SCHEMA = "alos.project-browser-owner-result.v1";
export const ALOS_ZERO_KEY_MODE = "deterministic-zero-key";
export const ALOS_BROWSER_OWNER_SHA256 = "b69fd7c0d1d0a552ab256340991e16055d7ed397973148ecadbe6d8e5af3f269";
export const ALOS_REQUIRED_TOOLS = Object.freeze(["browser.read", "browser.interact"]);
export const ALOS_REQUIRED_NEGATIVE_CHECKS = Object.freeze([
  "wrong_project_denied","permission_denied","noncanonical_path_denied","protocol_metadata_denied","private_network_denied",
]);
function need(condition, message) { if (!condition) throw new Error(`ALOS_PROJECT_BROWSER_CONTRACT: ${message}`); }
function validId(value) { return typeof value === "string" && BOUNDED_ID.test(value); }
function validSha(value) { return typeof value === "string" && GIT_SHA.test(value); }
export function buildAlosProjectBrowserAdmission({sourceCommit,taskId,correlationId,objective="Run the project Browser journey and return raw attributed evidence."}={}) {
  need(validSha(sourceCommit),"sourceCommit must be a full Git SHA");
  need(validId(taskId),"taskId is required");
  need(validId(correlationId),"correlationId is required");
  need(typeof objective==="string" && objective.trim().length>0 && objective.length<=1000,"objective is invalid");
  return Object.freeze({
    schema:ALOS_ADMISSION_SCHEMA, project:ALOS_PROJECT, repository:ALOS_REPOSITORY,
    source:Object.freeze({branch:ALOS_EXPECTED_SOURCE_BRANCH,commit:sourceCommit}),
    taskId,correlationId,objective:objective.trim(),
    route:"canonical-project-owner->deterministic-zero-key-agent->router->orchestrator->tool-executor->same-owner-browser->raw-verifier->same-project-owner",
    inference:Object.freeze({mode:ALOS_ZERO_KEY_MODE,provider:null,model:null,providerCredentialRequired:false,paidCostUsd:0}),
    requiredTools:ALOS_REQUIRED_TOOLS,browserOwnerSha256:ALOS_BROWSER_OWNER_SHA256,
    mintsExecutionIdentity:false,permitsPermissionWidening:false,permitsReplacementBrowser:false,permitsHostedPaidFallback:false,
  });
}
export function consumeAlosProjectBrowserResult(result,{admission}={}) {
  need(admission?.schema===ALOS_ADMISSION_SCHEMA,"matching admission is required");
  need(result?.schema===ALOS_OWNER_RESULT_SCHEMA,"owner-result schema mismatch");
  need(result?.project===ALOS_PROJECT,"wrong project");
  need(result?.repository===ALOS_REPOSITORY,"wrong repository");
  need(result?.status==="SUCCEEDED","route did not succeed");
  need(result?.source?.branch===ALOS_EXPECTED_SOURCE_BRANCH,"wrong source branch");
  need(result?.source?.commit===admission.source.commit && validSha(result?.source?.commit),"source commit mismatch");
  for (const field of ["actualAgentRun","routerExecuted","orchestratorExecuted","toolExecutorExecuted","sameOwnerBrowser","productionVerifierInvoked","persistedAllowedToolsEnforced","sameOwnerConsumed"]) need(result?.[field]===true,`${field} not proven`);
  need(Array.isArray(result?.allowedTools),"allowedTools missing");
  for (const tool of ALOS_REQUIRED_TOOLS) need(result.allowedTools.includes(tool),`missing tool ${tool}`);
  need(result?.browser?.ownerSha256===ALOS_BROWSER_OWNER_SHA256,"owner Browser identity mismatch");
  need(result?.browser?.nonRoot===true,"Browser must be non-root");
  need(result?.browser?.noNewPrivs===true,"Browser NoNewPrivs proof missing");
  need(result?.browser?.sandboxOverride===false,"Browser sandbox override forbidden");
  need(result?.browser?.managedPolicyUnchanged===true,"Browser managed policy changed");
  const inference=result?.inference;
  need(inference?.mode===ALOS_ZERO_KEY_MODE,"zero-key inference mode required");
  for(const field of ["provider","model","requestedModel","endpoint"]) need(inference?.[field]===null,`zero-key inference ${field} must be null`);
  need(Array.isArray(inference?.providerReceipts)&&inference.providerReceipts.length===0,"provider receipts forbidden");
  need(inference?.externalModelCalls===0,"external model calls forbidden");
  need(inference?.paidCostUsd===0,"paid model cost forbidden");
  need(Array.isArray(result?.runs)&&result.runs.length>=2,"two bounded runs are required");
  const executionIds=new Set(); const sessionIds=new Set();
  for(const run of result.runs){
    need(run?.status==="SUCCEEDED","each bounded run must succeed"); need(validId(run?.executionId),"run executionId invalid"); need(validId(run?.sessionId),"run sessionId invalid");
    need(!executionIds.has(run.executionId),"executionId reused"); need(!sessionIds.has(run.sessionId),"Browser session reused"); executionIds.add(run.executionId); sessionIds.add(run.sessionId);
    need(run?.actualAgentRun===true,"run is not an actual Agent run"); need(run?.inferenceMode===ALOS_ZERO_KEY_MODE,"run inference mode mismatch"); need(run?.modelInference===false,"zero-key run must not claim model inference"); need(run?.browserOwnerSha256===ALOS_BROWSER_OWNER_SHA256,"run Browser identity mismatch");
    for(const check of ALOS_REQUIRED_NEGATIVE_CHECKS) need(run?.checks?.[check]===true,`missing negative proof ${check}`);
    need(Array.isArray(run?.evidence)&&run.evidence.length>0,"run evidence missing");
    for(const evidence of run.evidence){ need(evidence?.producedByExecution===run.executionId,"evidence execution attribution mismatch"); need(validId(evidence?.producedByAction),"evidence action attribution missing"); need(typeof evidence?.sha256==="string"&&/^[0-9a-f]{64}$/.test(evidence.sha256),"evidence hash invalid");}
  }
  need(result?.reliability?.reopenProof===true,"reopen proof missing"); need(result?.reliability?.retryProof===true,"retry proof missing"); need(result?.reliability?.duplicateSideEffects===0,"duplicate side effects detected"); need(result?.deploymentClaimed===false,"integration must not claim deployment");
  return Object.freeze({accepted:true,project:ALOS_PROJECT,repository:ALOS_REPOSITORY,sourceCommit:admission.source.commit,executionIds:Object.freeze([...executionIds]),sessionIds:Object.freeze([...sessionIds]),inferenceMode:ALOS_ZERO_KEY_MODE,paidCostUsd:0,classification:Object.freeze({ROUTE_EXECUTED:true,OWNER_CONSUMED:true,WORKFLOW_ACCEPTED:true,DEPLOYED:false})});
}
