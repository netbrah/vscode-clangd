# Upstream LLVM mirror

Everything under `docs/upstream-llvm/` other than this `README.md` is mirrored verbatim from `llvm/llvm-project` for offline reference.

- Upstream snapshot SHA: `ddbb9704f4d246f6c2f87592dc78f347a265577e`
- Mirroring date (UTC): `2026-05-07`
- License: LLVM is licensed under Apache License 2.0 with LLVM Exceptions; see `LICENSE-LLVM.txt`.
- Skipped files: none.

The originally requested rendered pages are not mirrored as HTML:

- `https://clangd.llvm.org/design/` is not mirrored as HTML. As of the recorded `llvm/llvm-project` snapshot, the repository no longer contains `clang-tools-extra/clangd/docs/`; the mirrored upstream `clangd/README.md` points to `https://github.com/llvm/clangd-www/` as the current website source repository.
- `https://clang.llvm.org/doxygen/group__CINDEX__CURSOR__XREF.html` is not mirrored as HTML; instead the verbatim upstream source header `clang-c/Index.h` is mirrored, because its doc comments are the source for that Doxygen output.

## Mirrored files

| Mirrored file | Upstream URL |
| --- | --- |
| `LICENSE-LLVM.txt` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/LICENSE.TXT |
| `clang-c/Index.h` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang/include/clang-c/Index.h |
| `clangd/README.md` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/README.md |
| `clangd/index/Background.cpp` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/Background.cpp |
| `clangd/index/Background.h` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/Background.h |
| `clangd/index/BackgroundIndexLoader.cpp` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/BackgroundIndexLoader.cpp |
| `clangd/index/BackgroundIndexLoader.h` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/BackgroundIndexLoader.h |
| `clangd/index/BackgroundIndexStorage.cpp` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/BackgroundIndexStorage.cpp |
| `clangd/index/BackgroundQueue.cpp` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/BackgroundQueue.cpp |
| `clangd/index/BackgroundRebuild.cpp` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/BackgroundRebuild.cpp |
| `clangd/index/BackgroundRebuild.h` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/BackgroundRebuild.h |
| `clangd/index/CanonicalIncludes.cpp` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/CanonicalIncludes.cpp |
| `clangd/index/CanonicalIncludes.h` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/CanonicalIncludes.h |
| `clangd/index/FileIndex.cpp` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/FileIndex.cpp |
| `clangd/index/FileIndex.h` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/FileIndex.h |
| `clangd/index/Index.cpp` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/Index.cpp |
| `clangd/index/Index.h` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/Index.h |
| `clangd/index/IndexAction.cpp` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/IndexAction.cpp |
| `clangd/index/IndexAction.h` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/IndexAction.h |
| `clangd/index/MemIndex.cpp` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/MemIndex.cpp |
| `clangd/index/MemIndex.h` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/MemIndex.h |
| `clangd/index/Merge.cpp` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/Merge.cpp |
| `clangd/index/Merge.h` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/Merge.h |
| `clangd/index/ProjectAware.cpp` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/ProjectAware.cpp |
| `clangd/index/ProjectAware.h` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/ProjectAware.h |
| `clangd/index/Ref.cpp` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/Ref.cpp |
| `clangd/index/Ref.h` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/Ref.h |
| `clangd/index/Relation.cpp` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/Relation.cpp |
| `clangd/index/Relation.h` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/Relation.h |
| `clangd/index/Serialization.cpp` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/Serialization.cpp |
| `clangd/index/Serialization.h` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/Serialization.h |
| `clangd/index/StdLib.cpp` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/StdLib.cpp |
| `clangd/index/StdLib.h` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/StdLib.h |
| `clangd/index/Symbol.cpp` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/Symbol.cpp |
| `clangd/index/Symbol.h` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/Symbol.h |
| `clangd/index/SymbolCollector.cpp` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/SymbolCollector.cpp |
| `clangd/index/SymbolCollector.h` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/SymbolCollector.h |
| `clangd/index/SymbolID.cpp` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/SymbolID.cpp |
| `clangd/index/SymbolID.h` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/SymbolID.h |
| `clangd/index/SymbolLocation.cpp` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/SymbolLocation.cpp |
| `clangd/index/SymbolLocation.h` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/SymbolLocation.h |
| `clangd/index/SymbolOrigin.cpp` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/SymbolOrigin.cpp |
| `clangd/index/SymbolOrigin.h` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/SymbolOrigin.h |
| `clangd/index/YAMLSerialization.cpp` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/YAMLSerialization.cpp |
| `clangd/index/dex/Dex.cpp` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/dex/Dex.cpp |
| `clangd/index/dex/Dex.h` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/dex/Dex.h |
| `clangd/index/dex/Iterator.cpp` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/dex/Iterator.cpp |
| `clangd/index/dex/Iterator.h` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/dex/Iterator.h |
| `clangd/index/dex/PostingList.cpp` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/dex/PostingList.cpp |
| `clangd/index/dex/PostingList.h` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/dex/PostingList.h |
| `clangd/index/dex/Token.h` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/dex/Token.h |
| `clangd/index/dex/Trigram.cpp` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/dex/Trigram.cpp |
| `clangd/index/dex/Trigram.h` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/dex/Trigram.h |
| `clangd/index/dex/dexp/CMakeLists.txt` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/dex/dexp/CMakeLists.txt |
| `clangd/index/dex/dexp/Dexp.cpp` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/dex/dexp/Dexp.cpp |
| `clangd/index/remote/CMakeLists.txt` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/remote/CMakeLists.txt |
| `clangd/index/remote/Client.cpp` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/remote/Client.cpp |
| `clangd/index/remote/Client.h` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/remote/Client.h |
| `clangd/index/remote/Index.proto` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/remote/Index.proto |
| `clangd/index/remote/MonitoringService.proto` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/remote/MonitoringService.proto |
| `clangd/index/remote/README.md` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/remote/README.md |
| `clangd/index/remote/Service.proto` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/remote/Service.proto |
| `clangd/index/remote/marshalling/CMakeLists.txt` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/remote/marshalling/CMakeLists.txt |
| `clangd/index/remote/marshalling/Marshalling.cpp` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/remote/marshalling/Marshalling.cpp |
| `clangd/index/remote/marshalling/Marshalling.h` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/remote/marshalling/Marshalling.h |
| `clangd/index/remote/monitor/CMakeLists.txt` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/remote/monitor/CMakeLists.txt |
| `clangd/index/remote/monitor/Monitor.cpp` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/remote/monitor/Monitor.cpp |
| `clangd/index/remote/server/CMakeLists.txt` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/remote/server/CMakeLists.txt |
| `clangd/index/remote/server/Server.cpp` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/remote/server/Server.cpp |
| `clangd/index/remote/unimplemented/CMakeLists.txt` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/remote/unimplemented/CMakeLists.txt |
| `clangd/index/remote/unimplemented/UnimplementedClient.cpp` | https://github.com/llvm/llvm-project/blob/ddbb9704f4d246f6c2f87592dc78f347a265577e/clang-tools-extra/clangd/index/remote/unimplemented/UnimplementedClient.cpp |
