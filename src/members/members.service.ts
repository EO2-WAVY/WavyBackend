import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthService } from 'src/auth/auth.service';
import { AuthJwtDecoded } from 'src/auth/dtos/auth-jwt-core';
import { UserImageS3Service } from 'src/aws/aws-user-image.service';
import { MemberCertificationMethodCode } from 'src/common/enums/code.enum';
import { Repository } from 'typeorm';
import {
    CreateMemberInput,
    CreateMemberOutput,
} from './dtos/create-member.dto';
import {
    DeleteMemberOption,
    DeleteMemberOutput,
} from './dtos/delete-member.dto';
import {
    getLoggedInMemberOutput,
    GetMemberOutput,
} from './dtos/get-member.dto';
import {
    UpdateMemberInput,
    UpdateMemberOutput,
} from './dtos/update-member.dto';
import { Member } from './entities/members.entity';

@Injectable()
export class MembersService {
    constructor(
        @InjectRepository(Member)
        private readonly members: Repository<Member>,

        private readonly configService: ConfigService,

        @Inject(forwardRef(() => AuthService))
        private readonly authService: AuthService,

        private readonly userImageService: UserImageS3Service,
    ) {}

    private buildMember(newMemberInput: CreateMemberInput): Member {
        const newMember = this.members.create(newMemberInput);
        const systemMbrSeq = this.configService.get('SYSTEM_MBR_SEQ');

        newMember.creatorSeq = systemMbrSeq;
        newMember.updaterSeq = systemMbrSeq;

        return newMember;
    }

    private async saveMember(newMember: Member) {
        await this.members.save(newMember);
    }

    async createMember(
        newMemberInput: CreateMemberInput,
        jwt: AuthJwtDecoded,
    ): Promise<CreateMemberOutput> {
        try {
            switch (newMemberInput.certificationMethodCode) {
                case MemberCertificationMethodCode.KAKAO:
                    newMemberInput.mbrKakaoSeq =
                        await this.authService.getMbrKakaoSeq(jwt.accessToken);
                    break;
                default:
                    return {
                        ok: false,
                        error: '?????? ??????????????? ?????? ????????? ????????? ???????????? ?????? ????????????.',
                    };
            }

            const newMember = this.buildMember(newMemberInput);
            await this.saveMember(newMember);

            const newToken = this.authService.createJwt(
                newMember.mbrSeq,
                jwt.accessToken,
                jwt.exp,
            );

            const { ok, signedUrl, error } =
                await this.userImageService.getS3DownloadSignedUrl(newMember);

            if (!ok) {
                return { ok: false, error };
            }
            newMember.profileImageUrl = signedUrl;

            return { ok: true, member: newMember, token: newToken };
        } catch (error) {
            console.log(error.message);
            return { ok: false, error: '??????????????? ??????????????????.' };
        }
    }

    private checkMemberExists(member: Member) {
        const MEMBER_EXISTS = member;
        const IS_MEMBER_DELETED = !member.mbrDeleted;
        return MEMBER_EXISTS && !IS_MEMBER_DELETED;
    }

    async getLoggedInMember(member: Member): Promise<getLoggedInMemberOutput> {
        try {
            if (member.mbrSeq) {
                const { ok, signedUrl } =
                    await this.userImageService.getS3DownloadSignedUrl(member);
                if (ok) {
                    member.profileImageUrl = signedUrl;
                } else {
                    return {
                        ok: false,
                        error: '?????? ????????? ?????? url??? ???????????? ???????????????.',
                    };
                }
                return { ok: true, member };
            }
            return { ok: false, error: '?????? ?????? ????????? ??????????????????.' };
        } catch (error) {
            console.log(error.message);
            return { ok: false, error: '?????? ?????? ????????? ??????????????????.' };
        }
    }

    async getMemberBySeq(mbrSeq: string): Promise<GetMemberOutput> {
        try {
            const member = await this.members.findOne(mbrSeq);

            if (this.checkMemberExists(member)) {
                return { ok: false, error: '???????????? ?????? ???????????????.' };
            }

            member.mbrKakaoSeq = undefined;
            const { ok, signedUrl } =
                await this.userImageService.getS3DownloadSignedUrl(member);
            if (ok) {
                member.profileImageUrl = signedUrl;
            } else {
                return {
                    ok: false,
                    error: '?????? ????????? ?????? url??? ???????????? ???????????????.',
                };
            }

            return { ok: true, member };
        } catch (error) {
            console.log(`From getMemberBySeq: ${error.message}`);
            return { ok: false, error: '?????? ?????? ????????? ??????????????????.' };
        }
    }

    async getMemberByKakaoSeq(mbrKakaoSeq: string) {
        try {
            const member = await this.members.findOne({
                where: {
                    mbrKakaoSeq,
                },
            });

            if (this.checkMemberExists(member)) {
                return { ok: false, error: '???????????? ?????? ???????????????.' };
            }

            member.mbrKakaoSeq = undefined;
            return { ok: true, member };
        } catch (error) {
            return { ok: false, error: '?????? ?????? ????????? ??????????????????.' };
        }
    }

    async updateMember(
        memberSeq: string,
        updateMemberInput: UpdateMemberInput,
    ): Promise<UpdateMemberOutput> {
        try {
            const member = await this.members.findOne({
                mbrSeq: memberSeq,
            });

            if (!member) {
                return { ok: false, error: '?????? ?????? ????????? ??????????????????.' };
            }

            member.updaterSeq = member.mbrSeq;

            member.mbrNickname =
                updateMemberInput.mbrNickname ?? member.mbrNickname;
            member.videoOptionCode =
                updateMemberInput.videoOptionCode ?? member.videoOptionCode;
            member.profileImageUrl =
                updateMemberInput.profileImageUrl ?? member.profileImageUrl;

            await this.members.save(member);
            return { ok: true };
        } catch (error) {
            return { ok: false, error: '?????? ?????? ????????? ??????????????????.' };
        }
    }

    private async deleteMemberPrivateInfo(member: Member) {
        member.mbrEmail = '_';
        member.mbrNickname = '_';
        member.profileImageUrl = '_';
        member.mbrDeleted = true;

        switch (member.certificationMethodCode) {
            case MemberCertificationMethodCode.KAKAO:
                member.mbrKakaoSeq = null;
            default:
                member.mbrKakaoSeq = null;
        }

        await this.members.save(member);
    }

    async deleteMember(
        memberSeq: string,
        options?: DeleteMemberOption,
    ): Promise<DeleteMemberOutput> {
        try {
            const getMemberResult = await this.getMemberBySeq(memberSeq);

            if (!getMemberResult.ok) {
                return getMemberResult;
            }

            await this.deleteMemberPrivateInfo(
                getMemberResult.member as Member,
            );

            if (options?.purge) {
                /**
                 * TODO:
                 * Delete Every related
                 *
                 *  - Analyses
                 *  - Practices
                 *  - ExpHistories
                 *  - Bookmarks
                 *
                 */

                return { ok: true };
            }

            return { ok: true };
        } catch (error) {
            console.log(error.message, error.stack);
            return { ok: false, error: '?????? ?????? ????????? ??????????????????.' };
        }
    }
}
