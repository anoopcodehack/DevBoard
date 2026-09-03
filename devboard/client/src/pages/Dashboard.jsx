import React, { useState, useEffect } from "react";
import KanbanBoard from "../components/Board/KanbanBoard";
import PomodoroTimer from "../components/Pomodoro/PomodoroTimer";
import TaskModal from "../components/Task/TaskModal";
import Heatmap from "../components/Heatmap/Heatmap";
import { useBoard } from "../context/BoardContext";

const Dashboard = () => {

const {
user,
onlineUsers,
logout,
fetchTasks,
error,
updateTask,
deleteTask,
loading,
searchQuery,
setSearchQuery,
tasks,
addTask,
activeTag,
setActiveTag,
} = useBoard();

const inProgressCount = tasks.filter(
  (task) => task.status === "inprogress"
).length;

const doneCount = tasks.filter((task) => task.status === "done").length;
const donePercent =
  tasks.length === 0 ? 0 : Math.round((doneCount / tasks.length) * 100);



useEffect(() => {

document.title = inProgressCount > 0
  ? `(${inProgressCount}) DevBoard`
  : "DevBoard";

}, [inProgressCount]);




const [selectedTask, setSelectedTask] = useState(null);
const [recentTasks, setRecentTasks] = useState(() => {
  try {
    return JSON.parse(localStorage.getItem('recent_tasks') || '[]');
  } catch {
    return [];
  }
});

const handleSelectTask = (task) => {
  if (!task) return;
  const recent = JSON.parse(
    localStorage.getItem('recent_tasks') || '[]'
  );
  const updated = [task,
    ...recent.filter(t => t._id !== task._id)
  ].slice(0, 3);
  localStorage.setItem('recent_tasks', JSON.stringify(updated));
  setRecentTasks(updated);
  setSelectedTask(task);
};

const [isCreatingFirstTask, setIsCreatingFirstTask] = useState(false);

const [showScrollTop, setShowScrollTop] = useState(false);

const [activeCol, setActiveCol] = useState(0);

const [assigneeFilter, setAssigneeFilter] = useState("all");

const assignees = [
  ...new Set(tasks.map((task) => task.assignee?.name).filter(Boolean)),
].sort();

const filteredTasks = tasks.filter(
  (task) =>
    assigneeFilter === "all" || task.assignee?.name === assigneeFilter,
);



// Scroll To Top Visibility

useEffect(() => {


const handleScroll = () => {

setShowScrollTop(window.scrollY > 300);

};



window.addEventListener(
"scroll",
handleScroll
);



return () => {

window.removeEventListener(
"scroll",
handleScroll
);

};


}, []);

useEffect(() => {
  const handler = (e) => {
    if (e.key === "ArrowRight") {
      setActiveCol((prev) => Math.min(prev + 1, 3));
    }

    if (e.key === "ArrowLeft") {
      setActiveCol((prev) => Math.max(prev - 1, 0));
    }
  };

  window.addEventListener("keydown", handler);

  return () => {
    window.removeEventListener("keydown", handler);
  };
}, []);






if (loading) {

return (

<div className="flex items-center justify-center min-h-screen">

Loading...

</div>

);

}


if (error) {
  return (
    <div>
      <p>{error}</p>
      <button onClick={fetchTasks}>Try again</button>
    </div>
  );
}

const handleLogout = () => {

if (window.confirm("Are you sure you want to logout?")) {

logout();

}

};








const handleClearDone = async () => {

if (window.confirm("Clear all done tasks?")) {


const doneTasks =
tasks.filter(
(t) => t.status === "done"
);


await Promise.all(
doneTasks.map(
(t) => deleteTask(t._id)
)
);


}

};








const handleSessionComplete = async () => {


if (selectedTask) {


await updateTask(
selectedTask._id,
{
pomodoroCount:
(selectedTask.pomodoroCount || 0) + 1,
}
);


}


};








return (

<div className="min-h-screen flex flex-col">



{/* Top Navbar */}

<header className="flex items-center justify-between p-4 border-b border-[var(--border-primary)]">


<div className="flex items-center gap-3">


<span className="text-2xl">
🗂️
</span>


<div>

<h1 className="text-xl font-bold text-[#f0f0f0]">
DevBoard
</h1>


<span className="text-xs text-purple-400">
beta
</span>


</div>

{recentTasks.length > 0 && (
  <div className="flex items-center gap-1.5 ml-4">
    <span className="text-xs text-[#888]" title="Recently viewed tasks">🕐</span>
    {recentTasks.map((task) => (
      <button
        key={task._id}
        onClick={() => handleSelectTask(task)}
        className="text-xs bg-[#2a2a2f] hover:bg-[#3a3a40] text-[#e0e0e0] border border-[#444] px-2.5 py-0.5 rounded-full truncate max-w-[120px] transition"
        title={task.title}
      >
        {task.title}
      </button>
    ))}
  </div>
)}


</div>







<div className="flex items-center gap-4">


<span className="text-sm text-[#a0a0a5]">
🟢 {onlineUsers} online
</span>


<span className="text-sm text-[#a0a0a5]">

{filteredTasks.length}

{filteredTasks.length === 1 ? " task" : " tasks"}

</span>


<span className="text-sm text-green-400" title="Percentage of tasks completed">
📊 {donePercent}% done
</span>





{activeTag && (

<button

onClick={() => setActiveTag(null)}

className="text-xs bg-purple-600/30 text-purple-300 px-2 py-0.5 rounded-full flex items-center gap-1 hover:bg-purple-600/40 transition"

>

#{activeTag} ✕

</button>

)}

<select
  value={assigneeFilter}
  onChange={(e) => setAssigneeFilter(e.target.value)}
  aria-label="Filter tasks by assignee"
  className="bg-[#2a2a2f] text-[#888] text-xs rounded-lg px-2 py-1.5 border border-[#333]"
>
  <option value="all">All Members</option>
  {assignees.map((name) => (
    <option key={name} value={name}>
      {name}
    </option>
  ))}
</select>


<input

type="text"

value={searchQuery}

onChange={(e)=>setSearchQuery(e.target.value)}

placeholder="Search tasks by title or tag..."

className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl px-4 py-2 text-sm"

 />





<button>
⭐ Star on GitHub
</button>


<span>
👋 {user?.name}
</span>


<button onClick={handleClearDone}>
🗑️ Clear Done
</button>


<button onClick={handleLogout}>
Logout
</button>



</div>



</header>









{/* Activity Heatmap */}

<Heatmap />







{/* Pomodoro */}

<PomodoroTimer

activeTaskTitle={selectedTask?.title}

onSessionComplete={handleSessionComplete}

/>









{/* Board */}

<div className="flex-1 overflow-hidden">


{tasks.length === 0 ? (


<div className="flex flex-col items-center justify-center text-center p-8">


<span className="text-6xl mb-4">
👋
</span>



<h2 className="text-2xl font-semibold text-[#f0f0f0] mb-2">

Welcome to your board!

</h2>



<p className="text-[#a0a0a5] mb-6 max-w-md">

You don't have any tasks yet. Click + Add card to create your first one.

</p>




<button

onClick={() => setIsCreatingFirstTask(true)}

className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-lg"

>

+ Add your first card

</button>


</div>



) : (



<KanbanBoard 
tasks={filteredTasks}
onSelectTask={handleSelectTask}
activeCol={activeCol}
/>



)}


</div>









{/* Edit Modal */}

{selectedTask && (


<TaskModal

mode="edit"

task={selectedTask}

onClose={() => setSelectedTask(null)}


onSave={async(data)=>{

await updateTask(
selectedTask._id,
data
);


setSelectedTask(null);

}}


updateTask={updateTask}

/>


)}









{/* Create Modal */}


{isCreatingFirstTask && (


<TaskModal

mode="create"

defaultStatus="backlog"


onClose={() =>
setIsCreatingFirstTask(false)
}


onSave={async(data)=>{


await addTask(data);


setIsCreatingFirstTask(false);


}}


/>


)}









{/* Scroll To Top Button */}


{showScrollTop && (

<button

onClick={() =>

window.scrollTo({

top:0,

behavior:"smooth"

})

}

className="fixed bottom-6 right-6 bg-purple-600 hover:bg-purple-700 text-white w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-xl transition"

>

↑

</button>


)}





</div>


);

};


export default Dashboard;
