import { useState } from "react";
import axios from "axios";

export const useSuggestTags = (task, selectedSnippet, updateTask) =>{
    const [suggestedTags, setSuggestedTags] = useState([]);
    const [loadingTags, setLoadingTags] = useState(false);

const handleSuggestTags = async (e) => {
    e.stopPropagation();
    setLoadingTags(true);


    try{
        const { data } = await axios.post("/api/v1/ai/suggest-tags", {
                code: task.snippets[selectedSnippet].code,
        });

        setSuggestedTags(data.tags);
    } catch(err){
        console.error("suggest-tags failed:",err);
    } finally {
        setLoadingTags(false);
    }
}
const handleAddTag = (tag) => {
    const alreadyExist = task.tags?.some(
        (t) => t.toLowerCase() === tag.toLowerCase()
    );
    if(alreadyExist) return;

    updateTask(task._id, { tags:[...(task.tags || []),tag]});
    setSuggestedTags((prev)=> prev.filter((t)=> t !== tag));
}


    return {suggestedTags,loadingTags,handleSuggestTags,handleAddTag};
}