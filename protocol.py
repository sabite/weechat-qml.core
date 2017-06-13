# Copyright 2017 Tavy
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import struct
import zlib
from datetime import datetime


object_parsers = dict()


def parser(type):
    def wrapper(fn):
        object_parsers[type] = fn
        object_parsers[type.encode()] = fn
        return fn
    return wrapper


@parser('chr')
def parse_chr(data, off):
    return chr(data[off]), off+1


@parser('int')
def parse_int(data, off):
    msg, = struct.unpack_from('!i', data, off)
    return msg, off+4


@parser('buf')
def parse_buf(data, off):
    length, off = parse_int(data, off)
    if length == -1:
        return None, off
    else:
        buf = data[off:off+length]
        return buf, off+length


@parser('str')
def parse_str(data, off):
    string, off = parse_buf(data, off)
    if string is None:
        return None, off
    return string.decode('utf-8'), off


@parser('lon')
def parse_lon(data, off):
    length = data[off]
    off += 1
    num = data[off:off+length]
    return int(num), off+length


@parser('ptr')
def parse_ptr(data, off):
    length = data[off]
    off += 1
    ptr = '0x' + data[off:off+length].decode('ascii')
    return ptr, off+length


@parser('arr')
def parse_arr(data, off):
    type = data[off:off+3]
    off += 3
    count, off = parse_int(data, off)
    arr = []
    for _ in range(count):
        obj, off = parse(type, data, off)
        arr.append(obj)
    return arr, off


@parser('htb')
def parse_htb(data, off):
    ktype = data[off:off+3]
    off += 3
    vtype = data[off:off+3]
    off += 3
    count, off = parse_int(data, off)

    htb = dict()
    for _ in range(count):
        key, off = parse(ktype, data, off)
        value, off = parse(vtype, data, off)
        htb[key] = value

    return htb, off


@parser('tim')
def parse_tim(data, off):
    length = data[off]
    off += 1
    stamp = int(data[off:off+length])
    return datetime.fromtimestamp(stamp), off+length


@parser('hda')
def parse_hda(data, off):
    hpath, off = parse_str(data, off)
    keys, off = parse_str(data, off)
    count, off = parse_int(data, off)

    keys = [key.split(':', 2) for key in keys.split(',')]

    hda = {
        'h': hpath,
        'values': []
    }

    path_len = len(hpath.split('/'))

    for _ in range(count):
        obj = dict()
        obj['__path'] = []

        for _ in range(path_len):
            ptr, off = parse_ptr(data, off)
            obj['__path'].append(ptr)

        for key, type in keys:
            value, off = parse(type, data, off)
            obj[key] = value
        hda['values'].append(obj)

    return hda, off


def parse(type, data, start):
    parser = object_parsers.get(type)
    if not parser:
        raise NotImplementedError('parser for <%s>' % type)
    return parser(data, start)


def parse_message(frame):
    length, compressed, = struct.unpack_from('!L?', frame)
    assert (length == len(frame)), 'Length mismatch'
    rest = frame[5:]
    if compressed:
        rest = zlib.decompress(rest)

    objs = []
    id, off = parse_str(rest, 0)
    while off < len(rest):
        type = rest[off:off+3]
        off += 3
        obj, off = parse(type, rest, off)
        objs.append(obj)

    return id, objs


def init(password, compression=None):
    password = password.replace(',', '\,')
    if compression is None:
        compression = ''
    else:
        if type(compression) is str:
            compression = ',compression=%s' % compression
        elif compression:
            compression = ',compression=zlib'
        else:
            compression = ',compression=off'

    return 'init password=%s%s\n' % (password, compression)


def hdata(id, type, path, keys=[]):
    keys = ','.join([key.replace(',', '\,') for key in keys])
    return "(%s) hdata %s:%s %s\n" % (id, type, path, keys)


def info(id, name):
    return '(%s) info %s\n' % (id, name)


# Not sure how this works 100%, we don't implement the parser for it either
def infolist(id, name, pointer, *args):
    raise NotImplementedError


def nicklist(id, buffer=None):
    if buffer:
        return '(%s) nicklist %s\n' % (id, buffer)
    else:
        return '(%s) nicklist\n' % id


def input(id, buffer, data):
    return '(%s) input %s %s\n' % (id, buffer, data)


def sync(id, buffers, options):
    if options:
        assert buffers
        return '(%s) sync %s %s\n' % (id, buffers.join(','), options.join(','))
    elif buffers:
        return '(%s) sync %s\n' % (id, buffers.join(','))
    else:
        return '(%s) sync\n' % (id)


def desync(id, buffers, options):
    if options:
        assert buffers
        return '(%s) desync %s %s\n' % (id, buffers.join(','), options.join(','))
    elif buffers:
        return '(%s) desync %s\n' % (id, buffers.join(','))
    else:
        return '(%s) desync\n' % (id)

def test(id):
    return '(%s) test\n' % id


def quit():
    return 'quit\n'
