all:
	@echo "Usage: make [target]"
	@echo
	@echo "Targets:"
	@echo "  server  - start localhost https server (will write to sslkeylog.txt)"
	@echo "  capture - start tcpdump on local TLS traffic (will write to test.pcap)"
	@echo "  req     - do single https request"
	@echo "  clean   - rm slkeylog.txt and test.pcap"
	@echo

server:
	node server.js
	
req:
	curl -v -k https://localhost:8000/

capture:
	sudo tcpdump -i $(shell sudo tcpdump -D|grep Loopback|sed "s/\..*//") -w test.pcap port 8000

clean:
	rm -f sslkeylog.txt test.pcap
