import {useApp} from '../../context.jsx';
export default function ArtifactOpen({kind,title,iconSrc="./assets/uploads/artifact-open-tab.svg"}){const {openArtifact}=useApp();return <button className="icon-btn v7-open-card-tab" title="新开页签" aria-label={'新开页签：'+title} onClick={()=>openArtifact(kind,title)}><img src={iconSrc} width="14" height="14" alt="" /></button>}
