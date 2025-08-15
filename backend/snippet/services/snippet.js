import { Snippet } from "../models/snippet";

export const createSnippet = async (user_id, keyName, value, type) => {
    console.log(user_id, keyName, value);
    let snippet;
    snippet = await Snippet.findOne({ user_id: user_id, keyName: keyName });
    if (snippet) {
        return snippet;
    } else {
        snippet = new Snippet({ user_id: user_id, keyName: keyName, value: value, type: type });
        await snippet.save();
        return snippet;
    }
}

export const updateSnippet = async (snippet_id, user_id, keyName, value, type) => {
    let snippet;
    snippet = await Snippet.findOne({ _id: { $ne: snippet_id }, user_id: user_id, keyName: keyName });
    if (snippet) {
        return snippet;
    }

    const updateData = { keyName: keyName, value: value };
    if (type) {
        updateData.type = type;
    }

    snippet = await Snippet.findByIdAndUpdate({ _id: snippet_id }, updateData, { new: true });
    return snippet;
}

export const getSnippet = async (snippet_id, user_id) => {
    const snippet = await Snippet.findOne({ _id: snippet_id, user_id: user_id });
    return snippet;
}

export const getAllSnippets = async (user_id) => {
    const snippets = await Snippet.find({ user_id: user_id, status: "published" }).sort({ updated_at: -1 }); // Sort by updated_at in descending order (most recent first)
    return snippets;
}

export const deleteSnippet = async (snippet_id, user_id) => {
    const snippet = await Snippet.findOneAndUpdate({ _id: snippet_id, user_id: user_id }, { status: "archived" }, { new: true });
    return `Snippet ${snippet_id} deleted.`;
}
