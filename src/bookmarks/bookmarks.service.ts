import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as camelcaseKeys from 'camelcase-keys';
import { PaginationInput } from 'src/common/dtos/pagination.dto';
import { Member } from 'src/members/entities/members.entity';
import { RefVideo } from 'src/ref-videos/entities/ref-video.entity';
import { Repository } from 'typeorm';
import { BookmarksInput, BookmarksOutput } from './dtos/bookmarks.dto';
import { CheckBookmarkOutput } from './dtos/check-bookmark.dto';
import {
    CreateBookmarkInput,
    CreateBookmarkOutput,
} from './dtos/create-bookmark.dto';
import {
    DeleteBookmarkInput,
    DeleteBookmarkOutput,
} from './dtos/delete-bookmark.dto';

@Injectable()
export class BookmarksService {
    constructor(
        @InjectRepository(Member)
        private readonly members: Repository<Member>,
        @InjectRepository(RefVideo)
        private readonly refVideos: Repository<RefVideo>,
    ) {}

    async allBookmarks(
        authMember: Member,
        { page }: BookmarksInput,
    ): Promise<BookmarksOutput> {
        try {
            const sql = `
                SELECT * FROM ref_video
                JOIN (SELECT rv_seq FROM bookmarks
                WHERE mbr_seq = ${authMember.mbrSeq}) AS RVSEQ
                ON RVSEQ.rv_seq = ref_video.rv_seq
                LIMIT ${PaginationInput.take}
                OFFSET ${PaginationInput.skip(+page)}
            `;
            const sql2 = `
                SELECT COUNT(ref_video.rv_seq) AS totalresults FROM ref_video
                JOIN (SELECT rv_seq FROM bookmarks
                WHERE mbr_seq = ${authMember.mbrSeq}) AS RVSEQ
                ON RVSEQ.rv_seq = ref_video.rv_seq
            `;
            let sqlRawResults;
            let sql2RawResults;
            await this.refVideos.manager.connection.transaction(
                async (manager) => {
                    sqlRawResults = await manager.query(sql);
                    sql2RawResults = await manager.query(sql2);
                },
            );
            if (!sqlRawResults) {
                return {
                    ok: false,
                    error: '???????????? ?????? ??? ????????????',
                };
            }
            const bookmarkedRefVideos = camelcaseKeys(sqlRawResults);
            const { totalresults } = sql2RawResults[0];
            const totalPages = Math.ceil(totalresults / PaginationInput.take);
            return {
                ok: true,
                totalResults: +totalresults,
                totalPages,
                bookmarkedRefVideos,
            };
        } catch (error) {
            return {
                ok: false,
                error: '???????????? ?????? ??? ????????????',
            };
        }
    }

    async checkBookmark(
        authMember: Member,
        rvSeq: string,
    ): Promise<CheckBookmarkOutput> {
        try {
            const refVideo = await this.refVideos.findOne(rvSeq);
            if (!refVideo) {
                return {
                    ok: true,
                    isBookmarked: false,
                };
            }
            const isBookmarked = await this.findBookmarkByMbrSeqAndRvSeq(
                authMember.mbrSeq,
                rvSeq,
            );
            return {
                ok: true,
                isBookmarked: isBookmarked,
            };
        } catch (error) {
            return {
                ok: false,
                error: '????????? ????????? ?????? ??? ??? ????????????',
            };
        }
    }

    async findBookmarkByMbrSeqAndRvSeq(
        mbrSeq: string,
        rvSeq: string,
    ): Promise<boolean> {
        const sql = `
                SELECT COUNT(*) FROM bookmarks
                WHERE mbr_seq = ${mbrSeq} AND rv_seq = ${rvSeq}
            `;
        const sqlRawResults = await this.members.query(sql);
        const { count } = sqlRawResults[0];
        return count > 0 ? true : false;
    }

    async findBookmarkByMbrSeq(mbrSeq: string): Promise<[RefVideo]> {
        const sql = `
                SELECT * FROM ref_video AS rv
                JOIN (SELECT * FROM bookmarks
                WHERE mbr_seq = ${mbrSeq}) AS bm 
                ON bm.rv_seq = rv.rv_seq
            `;
        const sqlRawResults = await this.members.query(sql);
        return camelcaseKeys(sqlRawResults);
    }

    async createBookmark(
        authMember: Member,
        { rvSeq }: CreateBookmarkInput,
    ): Promise<CreateBookmarkOutput> {
        try {
            const member = this.members.create(authMember);
            const refVideo = await this.refVideos.findOne(rvSeq);
            if (!refVideo) {
                return {
                    ok: false,
                    error: '???????????? ?????? ????????? ??????????????????',
                };
            }
            const isBookmarked = await this.findBookmarkByMbrSeqAndRvSeq(
                authMember.mbrSeq,
                rvSeq,
            );
            if (isBookmarked) {
                return {
                    ok: false,
                    error: '?????? ????????? ???????????????',
                };
            }
            const results = await this.findBookmarkByMbrSeq(member.mbrSeq);
            const refVideos = results.map((refVideo) =>
                this.refVideos.create(refVideo),
            );
            refVideos.push(refVideo);
            member.bookmarkedRefVideos = refVideos;
            await this.members.save(member);
            return {
                ok: true,
                bookmarkedRefVideo: refVideo,
            };
        } catch (error) {
            return {
                ok: false,
                error: '????????? ?????? ??? ??? ????????????',
            };
        }
    }

    async deleteBookmark(
        authMember: Member,
        { rvSeq }: DeleteBookmarkInput,
    ): Promise<DeleteBookmarkOutput> {
        try {
            const refVideo = await this.refVideos.findOne(rvSeq);
            if (!refVideo) {
                return {
                    ok: false,
                    error: '???????????? ?????? ????????? ??????????????????',
                };
            }
            const sql = `
                DELETE FROM bookmarks
                WHERE mbr_seq = ${authMember.mbrSeq} 
                AND rv_seq = ${rvSeq}
            `;
            const sqlRawResults = await this.members.query(sql);
            const count = sqlRawResults[1];
            if (count == 0) {
                return {
                    ok: false,
                    error: '????????? ?????? ??? ??? ????????????',
                };
            }
            return {
                ok: true,
            };
        } catch (error) {
            return {
                ok: false,
                error: '????????? ?????? ??? ??? ????????????',
            };
        }
    }
}
