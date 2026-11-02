import {useApp} from '../../context.jsx';
// kind 对应共享画布产物：由 context 创建内部页签，保留左侧 AI 框架。
export default function ArtifactOpen({kind,title,iconSrc="./assets/uploads/artifact-open-tab.svg"}){const {openArtifact}=useApp();return <button type="button" className="icon-btn v7-open-card-tab" title="在当前页面的新画布页签中独立查看" aria-label={'新开页签：'+title} onClick={()=>openArtifact(kind,title)}><img src={iconSrc} width="14" height="14" alt="" /></button>}
