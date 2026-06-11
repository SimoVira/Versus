let _selectedIds: string[] = [];

function normalizeSelectedIds(ids: string[]) {
    return ids.filter(function (id, index) {
        return ids.indexOf(id) === index;
    }).slice(0, 2);
}

export const selectStore = {
    getSelectedIds: function () { return [..._selectedIds]; },
    setSelectedIds: function (ids: string[]) { _selectedIds = normalizeSelectedIds(ids); },
    addSelectedId: function (id: string) {
        if (_selectedIds.includes(id)) return;
        if (_selectedIds.length >= 2) _selectedIds = [_selectedIds[0], id];
        else _selectedIds = [..._selectedIds, id];
    },
    reset: function () {
        _selectedIds = [];
    },
};
