import {
    IsEmail,
    IsEnum,
    IsNumberString,
    IsString,
    IsUrl,
} from 'class-validator';
import { Analysis } from 'src/analyses/entities/analyses.entity';
import { CoreEntity } from 'src/common/entities/core.entity';
import {
    MemberRefVideoIsBookmarkedCode,
    MemberMarketingConsentCode,
    MemberPrivacyConsentCode,
    MemberVideoOptionCode,
} from 'src/common/enums/code.enum';
import { Practice } from 'src/practices/entities/practice.entity';
import { RefVideo } from 'src/ref-videos/entities/ref-video.entity';
import {
    Column,
    Entity,
    JoinTable,
    ManyToMany,
    OneToMany,
    PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class Member extends CoreEntity {
    @PrimaryGeneratedColumn({ name: 'mbr_seq', type: 'bigint' })
    @IsNumberString()
    mbrSeq: string;

    @Column({ name: 'mbr_email', type: 'varchar', length: 255 })
    @IsEmail()
    mbrEmail: string;

    @Column({ name: 'mbr_nickname', type: 'varchar', length: 255 })
    @IsString()
    mbrNickname: string;

    @Column({
        name: 'mbr_certification_method_cd',
        type: 'varchar',
        length: 50,
    })
    @IsEnum(MemberRefVideoIsBookmarkedCode)
    certificationMethodCode: string;

    @Column({
        name: 'mbr_profile_image_url',
        type: 'varchar',
        length: 255,
        nullable: true,
    })
    @IsUrl()
    profileImageUrl: string;

    @Column({ name: 'mbr_privacy_consent', type: 'varchar', length: 50 })
    @IsEnum(MemberPrivacyConsentCode)
    privacyConsentCode: string;

    @Column({ name: 'mbr_marketing_consent', type: 'varchar', length: 50 })
    @IsEnum(MemberMarketingConsentCode)
    marketingConsentCode: string;

    @Column({
        name: 'mbr_video_option',
        type: 'varchar',
        length: 50,
        default: '40002',
    })
    @IsEnum(MemberVideoOptionCode)
    videoOptionCode: string;

    @OneToMany((type) => Analysis, (analysis) => analysis.member)
    analyses: Analysis[];

    @OneToMany((type) => Practice, (practice) => practice.member)
    practices: Practice[];

    @ManyToMany((type) => RefVideo)
    @JoinTable({
        name: 'bookmarks',
        joinColumn: {
            name: 'mbr_seq',
            referencedColumnName: 'mbrSeq',
        },
        inverseJoinColumn: {
            name: 'rv_seq',
            referencedColumnName: 'rvSeq',
        },
    })
    bookmarkedRefVideos: RefVideo[];
}
