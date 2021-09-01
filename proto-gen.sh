#!/bin/bash - excute our proto loader

yarn proto-loader-gen-types --grpcLib=@grpc/grpc-js --outDir=proto/ proto/*.proto

