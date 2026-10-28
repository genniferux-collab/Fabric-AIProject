import {useApp} from "../../context.jsx";

// The home cards and map tips read the same task-derived snapshot.
export default function useLiveMetrics(){
  return useApp().networkTasks.metrics;
}
