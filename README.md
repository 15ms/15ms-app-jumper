# 15ms-router

A domain name access HTTP API server.

## Usage

### APIs

#### bind name with host
http://15ms/?verb=bind&data=name,host,code&hash=

#### kill name
http://15ms/?verb=kill&data=name,code&hash=

#### find name
http://15ms/?verb=find&data=name&hash=

#### list name
http://15ms/?verb=list&hash=

#### hash
substr(hex(sha256(JSON({ verb, data, time = YYYY-MM-DD HH:mm }))), HH * 2, 18)

### Jump
http://15ms/name...

**localhost is invalid**