import QtQuick 2.2
import io.thp.pyotherside 1.4

import "model"
import "weechat/index.js" as Weechat

Python {
    id: weechat

    property Buffers buffers: Buffers { }
    property int latency
    property bool isConnected: false

    signal ready()
    signal pong(var args)
    signal bufferLineAdded(var buffer, var line)
    signal bufferLinesLoaded(var buffer, var line)
    signal listBuffers(var msgs)
    signal bufferOpened(var msgs)
    signal bufferRenamed(var msgs)
    signal bufferLocalVarAdded(var msgs)
    signal bufferClosing(var msgs)
    signal hotlist(var msgs)
    signal connected()

    signal highlight(var line, var buffer)
    signal loadedLines(var buffer, int count)

    function connect(uri, password) {
        Weechat.connect(uri.toString(), password)
    }

    function input(buffer, data) {
        Weechat.input(buffer, data);
    }

    function send(data) {
        Weechat._send(data);
    }


    function loadBufferLines(buffer) {
        Weechat.loadBufferLines(buffer);
    }

    function loadMoreBufferLines(buffer) {
        Weechat.loadMoreBufferLines(buffer);
    }
    function markBufferRead(buffer) {
        Weechat.markBufferRead(buffer);
    }

    onListBuffers: Weechat.onListBuffers(msgs[0].values);
    onPong: {
        var m;
        if (args[0] == "connected") {
            connected()
            isConnected = true
            Weechat._send(["ping", "latency", Date.now(), "\n"].join(' '));
        } else if (m = args[0].match(/^latency (\d+)/)) {
            latency = Date.now() - +m[1];
            console.log(latency)
        } else {
            console.log("Unhandled pong type", JSON.stringify(args[0]));
        }
    }

    Component.onCompleted: {
        setHandler('_pong', pong)
        Weechat.init();

        addImportPath(Qt.resolvedUrl("."))
        importModule("weechat", function(stat) {
            ready()
        })
    }
}
