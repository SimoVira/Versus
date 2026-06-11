let _pendingId: string | null = null;

export const selectStore = {
    get: function () { return _pendingId; },
    set: function (id: string | null) { _pendingId = id; },
};