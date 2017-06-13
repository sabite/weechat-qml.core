import QtQuick 2.2

ListModel {
    id: _

    property var _ptrs: []

    function _getSortKey(buffer) {
        if (buffer._sort_key) {
            return buffer._sort_key;
        }

        var parts = buffer.full_name.split('.');
        if (parts[1] === 'server') {
            parts.splice(1,1);
        }

        buffer._sort_key = parts.join('.');
        return buffer._sort_key;
    }

    function addBuffer(buffer) {
        buffer.pointer = buffer.__path[0];
        delete buffer.__path;

        var idx;
        for (idx=0; idx<count; ++idx) {
            if (_getSortKey(buffer) < _getSortKey(get(idx)))
            break;
        }

        _ptrs.splice(idx, 0, buffer.pointer);
        buffer.lines = [];
        buffer.hot_count = {low: 0, msg: 0, priv: 0, high: 0};
        insert(idx, buffer)
    }

    function addAllBuffers(buffers) {
        clear()
        _ptrs = []

        buffers.sort(function(left, right) {
            if (_getSortKey(left) < _getSortKey(right))
                return -1;
            if (_getSortKey(left) > _getSortKey(right))
                return 1;
            return 0;
        });

        var i
        for(i = 0; i < buffers.length; ++i) {
            var buffer = buffers[i]

            buffer.pointer = buffer.__path[0];
            delete buffer.__path;

            _ptrs.push(buffer.pointer)
            //buffer.lines = _listModelT.createObject(_)
            buffer.lines = [];
            buffer.hot_count = {low: 0, msg: 0, priv: 0, high: 0};
            append(buffer)
        }
    }

    function getBuffer(pointer) {
        var idx = _ptrs.indexOf(pointer)
        if (idx != -1) {
            return get(idx)
        }
    }

    function updateBuffer(pointer, props) {
        var idx = _ptrs.indexOf(pointer)
        if (idx != -1)
            set(idx, props);
    }

    function removeBuffer(pointer) {
        var idx = _ptrs.indexOf(pointer)
        if (idx == -1)
        return;

        _ptrs.slice(idx, 1);
        remove(idx, 1);
    }
}
