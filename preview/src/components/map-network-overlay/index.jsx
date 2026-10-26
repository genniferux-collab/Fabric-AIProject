import {useState} from "react";
import "./index.css";

// Original source artwork has these three visible data-center symbols.
// The source bitmap and these hit regions use the same 1691×1261 coordinate space.
const referenceCenters=[
  {id:"xisanqi",name:"西三旗",x:1154,y:582},
  {id:"jiading",name:"嘉定",x:1262,y:868},
  {id:"waigaoqiao",name:"外高桥",x:1308,y:888},
];
export default function MapNetworkOverlay(){
  const [selected,setSelected]=useState(null);
  return <div className="map-network-overlay" aria-label="原始地图的数据中心交互层">
    <img className="map-reference-name" src="./assets/uploads/pixso-home-map/map-label.svg" alt="西三旗"/>
    {referenceCenters.map(center=><button type="button" key={center.id} className={`map-reference-hotspot${selected===center.id?" is-selected":""}`} style={{left:`${center.x/1691*100}%`,top:`${center.y/1261*100}%`}} aria-label={`查看${center.name}数据中心`} aria-pressed={selected===center.id} title={`${center.name}数据中心`} onClick={()=>setSelected(selected===center.id?null:center.id)} onKeyDown={event=>{if(event.key==="Escape")setSelected(null);}}/>)}
  </div>;
}
