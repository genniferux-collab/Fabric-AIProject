// Static resource inventory only. All task counts/statuses come from the shared task ledger.
import {networkCenterInventory} from "./task-registry.js";
export const mapCenterDetails={
  xisanqi:{
    name:"西三旗",alarms:6,
    devices:networkCenterInventory.xisanqi,
  },
  jiading:{
    name:"嘉定",alarms:2,
    devices:networkCenterInventory.jiading,
  },
  waigaoqiao:{
    name:"外高桥",alarms:0,
    devices:networkCenterInventory.waigaoqiao,
  },
};
