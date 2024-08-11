import {Snippet} from "../models/snippet";

export const createSnippet = async (user_id, keyName, value, type) => {
    console.log(user_id, keyName, value);
    let snippet;
    snippet = await Snippet.findOne({ user_id: user_id, keyName: keyName });
    if (snippet) {
        return `keyName ${keyName} already exists.`;
    } else {
        snippet = new Snippet({ user_id: user_id, keyName: keyName, value: value, type: type });
        await snippet.save();
        return `Snippet created successfully`;
    }
}

export const updateSnippet = async (snippet_id, user_id, keyName, value) => {
    let snippet;
    snippet = await Snippet.findOne({ _id: { $ne: snippet_id }, user_id: user_id, keyName: keyName });
    if (snippet) {
        return `keyName ${keyName} already exists.`;
    }
    snippet = await Snippet.findByIdAndUpdate({ _id: snippet_id }, { keyName: keyName, value: value }, { new: true });
    return snippet;
}

export const getSnippet = async (snippet_id, user_id) => {
    const snippet = await Snippet.findOne({ _id: snippet_id, user_id: user_id });
    return snippet;
}

export const getAllSnippets = async (user_id) => {
    const snippets = await Snippet.find({ user_id: user_id, status: "published" });
    return snippets;
}

export const deleteSnippet = async (snippet_id, user_id) => {
    const snippet = await Snippet.findOneAndUpdate({ _id: snippet_id, user_id: user_id }, { status: "archived" }, { new: true });
    return `Snippet ${snippet_id} deleted.`;
}
