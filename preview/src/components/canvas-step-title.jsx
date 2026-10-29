import {useApp} from '../context.jsx';
export default function CanvasStepTitle({kind,children,id}) {
 const {focusLuiArtifact}=useApp();
 return <div id={id} className="v7-artifact-step-title">{children}<button type="button" className="canvas-step-locate" aria-label={'定位左侧步骤：'+children} title="定位左侧步骤" onClick={()=>focusLuiArtifact(kind,'step')}><span aria-hidden="true"/></button></div>;
}
