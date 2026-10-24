import {useApp} from '../../context.jsx';
import {Icon} from '../../../assets/shared/icon.jsx';
export default function ArtifactOpen({kind,title}){const {openArtifact}=useApp();return <button className="icon-btn v7-open-card-tab" title="新开页签" aria-label={'新开页签：'+title} onClick={()=>openArtifact(kind,title)}><Icon name="external-link" className="ic" strokeWidth={1.6}/></button>}
