let _pendingId: string | null = null;
let _selectedIds: string[] = [];

function normalizeSelectedIds(ids: string[]) {
    return ids.filter(function (id, index) {
        return ids.indexOf(id) === index;
    }).slice(0, 2);
}

export const selectStore = {
    get: function () { return _pendingId; },
    set: function (id: string | null) { _pendingId = id; },
    getSelectedIds: function () { return [..._selectedIds]; },
    setSelectedIds: function (ids: string[]) { _selectedIds = normalizeSelectedIds(ids); },
    addSelectedId: function (id: string) {
        if (_selectedIds.includes(id)) return;
        if (_selectedIds.length >= 2) _selectedIds = [_selectedIds[0], id];
        else _selectedIds = [..._selectedIds, id];
    },
};
