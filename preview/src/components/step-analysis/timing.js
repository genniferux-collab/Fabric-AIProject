export const analysisThoughtDuration=text=>Math.ceil(Array.from(text).length/32*1000)+450;
export const analysisConclusionDuration=text=>Math.ceil(Array.from(text).length/32*1000)+250;
export const analysisStepDuration=(thought,conclusion)=>analysisThoughtDuration(thought)+analysisConclusionDuration(conclusion)+1000;
