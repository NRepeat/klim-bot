--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (Ubuntu 16.9-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.9 (Ubuntu 16.9-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: AccessType; Type: TYPE; Schema: public; Owner: nikita
--

CREATE TYPE public."AccessType" AS ENUM (
    'PUBLIC',
    'WORKER',
    'ADMIN'
);


ALTER TYPE public."AccessType" OWNER TO nikita;

--
-- Name: CurrencyEnum; Type: TYPE; Schema: public; Owner: nikita
--

CREATE TYPE public."CurrencyEnum" AS ENUM (
    'UAH',
    'USD'
);


ALTER TYPE public."CurrencyEnum" OWNER TO nikita;

--
-- Name: PaymentMethodEnum; Type: TYPE; Schema: public; Owner: nikita
--

CREATE TYPE public."PaymentMethodEnum" AS ENUM (
    'CARD',
    'IBAN'
);


ALTER TYPE public."PaymentMethodEnum" OWNER TO nikita;

--
-- Name: RoleEnum; Type: TYPE; Schema: public; Owner: nikita
--

CREATE TYPE public."RoleEnum" AS ENUM (
    'GUEST',
    'ADMIN',
    'WORKER'
);


ALTER TYPE public."RoleEnum" OWNER TO nikita;

--
-- Name: Status; Type: TYPE; Schema: public; Owner: nikita
--

CREATE TYPE public."Status" AS ENUM (
    'PENDING',
    'COMPLETED',
    'ACCEPTED',
    'FAILED'
);


ALTER TYPE public."Status" OWNER TO nikita;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AdminRequestPhotoMessage; Type: TABLE; Schema: public; Owner: nikita
--

CREATE TABLE public."AdminRequestPhotoMessage" (
    id text NOT NULL,
    "requestId" text NOT NULL,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."AdminRequestPhotoMessage" OWNER TO nikita;

--
-- Name: BlackList; Type: TABLE; Schema: public; Owner: nikita
--

CREATE TABLE public."BlackList" (
    id text NOT NULL,
    "requestId" text,
    reason text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."BlackList" OWNER TO nikita;

--
-- Name: CardBank; Type: TABLE; Schema: public; Owner: nikita
--

CREATE TABLE public."CardBank" (
    id text NOT NULL,
    number text NOT NULL,
    "bankName" text NOT NULL,
    "bankNameEn" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    icon text
);


ALTER TABLE public."CardBank" OWNER TO nikita;

--
-- Name: CardPaymentRequestsMethod; Type: TABLE; Schema: public; Owner: nikita
--

CREATE TABLE public."CardPaymentRequestsMethod" (
    id text NOT NULL,
    card text NOT NULL,
    comment text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "bankId" text,
    "requestId" text
);


ALTER TABLE public."CardPaymentRequestsMethod" OWNER TO nikita;

--
-- Name: Currency; Type: TABLE; Schema: public; Owner: nikita
--

CREATE TABLE public."Currency" (
    id text NOT NULL,
    code text NOT NULL,
    "nameEn" text NOT NULL,
    symbol text,
    name public."CurrencyEnum" NOT NULL
);


ALTER TABLE public."Currency" OWNER TO nikita;

--
-- Name: IbanPaymentRequestsMethod; Type: TABLE; Schema: public; Owner: nikita
--

CREATE TABLE public."IbanPaymentRequestsMethod" (
    id text NOT NULL,
    iban text NOT NULL,
    inn text NOT NULL,
    comment text,
    name text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "requestId" text
);


ALTER TABLE public."IbanPaymentRequestsMethod" OWNER TO nikita;

--
-- Name: Message; Type: TABLE; Schema: public; Owner: nikita
--

CREATE TABLE public."Message" (
    id text NOT NULL,
    "chatId" bigint NOT NULL,
    "messageId" integer NOT NULL,
    text text,
    "photoUrl" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "requestId" text NOT NULL,
    "accessType" public."AccessType" DEFAULT 'PUBLIC'::public."AccessType" NOT NULL
);


ALTER TABLE public."Message" OWNER TO nikita;

--
-- Name: PaymentMethod; Type: TABLE; Schema: public; Owner: nikita
--

CREATE TABLE public."PaymentMethod" (
    id text NOT NULL,
    "nameEn" public."PaymentMethodEnum" NOT NULL,
    description text,
    "descriptionEn" text,
    icon text
);


ALTER TABLE public."PaymentMethod" OWNER TO nikita;

--
-- Name: PaymentRequests; Type: TABLE; Schema: public; Owner: nikita
--

CREATE TABLE public."PaymentRequests" (
    id text NOT NULL,
    "vendorId" text NOT NULL,
    "userId" text,
    "payedByUserId" text,
    amount double precision NOT NULL,
    status public."Status" DEFAULT 'PENDING'::public."Status" NOT NULL,
    error text,
    "currencyId" text NOT NULL,
    "notificationSent" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "ratesId" text,
    "activeUserId" text,
    "paymentMethodId" text
);


ALTER TABLE public."PaymentRequests" OWNER TO nikita;

--
-- Name: Rates; Type: TABLE; Schema: public; Owner: nikita
--

CREATE TABLE public."Rates" (
    id text NOT NULL,
    "currencyId" text NOT NULL,
    "minAmount" double precision NOT NULL,
    "maxAmount" double precision NOT NULL,
    rate double precision NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "paymentMethodId" text NOT NULL
);


ALTER TABLE public."Rates" OWNER TO nikita;

--
-- Name: Role; Type: TABLE; Schema: public; Owner: nikita
--

CREATE TABLE public."Role" (
    id text NOT NULL,
    name public."RoleEnum" NOT NULL
);


ALTER TABLE public."Role" OWNER TO nikita;

--
-- Name: Settings; Type: TABLE; Schema: public; Owner: nikita
--

CREATE TABLE public."Settings" (
    name text DEFAULT 'default'::text NOT NULL,
    "onPause" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Settings" OWNER TO nikita;

--
-- Name: User; Type: TABLE; Schema: public; Owner: nikita
--

CREATE TABLE public."User" (
    id text NOT NULL,
    username text,
    "telegramId" bigint NOT NULL,
    "onPause" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."User" OWNER TO nikita;

--
-- Name: Vendors; Type: TABLE; Schema: public; Owner: nikita
--

CREATE TABLE public."Vendors" (
    id text NOT NULL,
    "chatId" bigint NOT NULL,
    work boolean DEFAULT false NOT NULL,
    "showReceipt" boolean DEFAULT false NOT NULL,
    title text NOT NULL,
    token text,
    "lastReportedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP,
    "lastAllRatesSentAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP,
    "lastAllRateMessageId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Vendors" OWNER TO nikita;

--
-- Name: WorkerRequestPhotoMessage; Type: TABLE; Schema: public; Owner: nikita
--

CREATE TABLE public."WorkerRequestPhotoMessage" (
    id text NOT NULL,
    "requestId" text NOT NULL,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."WorkerRequestPhotoMessage" OWNER TO nikita;

--
-- Name: _BlackListToCardPaymentRequestsMethod; Type: TABLE; Schema: public; Owner: nikita
--

CREATE TABLE public."_BlackListToCardPaymentRequestsMethod" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_BlackListToCardPaymentRequestsMethod" OWNER TO nikita;

--
-- Name: _RoleToUser; Type: TABLE; Schema: public; Owner: nikita
--

CREATE TABLE public."_RoleToUser" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_RoleToUser" OWNER TO nikita;

--
-- Name: _UserToVendors; Type: TABLE; Schema: public; Owner: nikita
--

CREATE TABLE public."_UserToVendors" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_UserToVendors" OWNER TO nikita;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: nikita
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO nikita;

--
-- Data for Name: AdminRequestPhotoMessage; Type: TABLE DATA; Schema: public; Owner: nikita
--

COPY public."AdminRequestPhotoMessage" (id, "requestId", "userId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: BlackList; Type: TABLE DATA; Schema: public; Owner: nikita
--

COPY public."BlackList" (id, "requestId", reason, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: CardBank; Type: TABLE DATA; Schema: public; Owner: nikita
--

COPY public."CardBank" (id, number, "bankName", "bankNameEn", "createdAt", "updatedAt", icon) FROM stdin;
cmdysv6u10009iepf0410h06g	410247	Альфа-Банк	Alfa-Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u1000aiepfrmcpya2k	422605	Альфа-Банк	Alfa-Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u1000biepf5wy6kre5	423719	Альфа-Банк	Alfa-Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u1000ciepfa4ye58j8	536364	Альфа-Банк	Alfa-Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u1000diepftbganyx5	543259	Альфа-Банк	Alfa-Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u1000eiepffl1tdr02	544904	Альфа-Банк	Alfa-Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u1000fiepf7uy6qy0n	547994	Альфа-Банк	Alfa-Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u1000giepfjn72ymgk	411948	Креді Агріколь Банк	Credit Agricole	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u1000hiepfcqxds18o	512439	Креді Агріколь Банк	Credit Agricole	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u1000iiepf4k45mcsp	519745	Креді Агріколь Банк	Credit Agricole	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u1000jiepfwkxvh1r2	520662	Креді Агріколь Банк	Credit Agricole	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u1000kiepfe6hji1jy	525822	Креді Агріколь Банк	Credit Agricole	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u1000liepfv596ndvx	423174	Діамантбанк	Diamantbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u1000miepfy6k2yo2y	429453	Діамантбанк	Diamantbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u1000niepf5d9ls16t	467936	Діамантбанк	Diamantbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u1000oiepfvybxf45v	438253	Кредобанк	KredoBank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u1000piepftkdtq8c4	515662	Ощадбанк	Oschadbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u1000qiepf55kxh3o7	545265	Ощадбанк	Oschadbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u1000riepfipphtqc3	555952	Ощадбанк	Oschadbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u1000siepf6dwf5xsx	557744	Ощадбанк	Oschadbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u1000tiepfnf3iun70	406760	OTP Bank	OTP Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u1000uiepf0lu6arvz	406788	OTP Bank	OTP Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u1000viepf8d4dqwzg	411749	OTP Bank	OTP Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u1000wiepfgqtul7fz	416955	OTP Bank	OTP Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u1000xiepfjhkjdkhc	436323	OTP Bank	OTP Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u1000yiepfs56hq0qu	471362	OTP Bank	OTP Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u1000ziepfzob1bqk8	528534	OTP Bank	OTP Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u10010iepf185d3l1b	533194	OTP Bank	OTP Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u10011iepfi93xds2l	546886	OTP Bank	OTP Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u10012iepfy4lxifmq	547266	OTP Bank	OTP Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u20013iepfztcdv2pa	404764	ПРАВЕКС-БАНК	PRAVEX-BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u20014iepfj18dlw42	405247	ПРАВЕКС-БАНК	PRAVEX-BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u20015iepf2y6brrwg	409089	ПРАВЕКС-БАНК	PRAVEX-BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u20016iepfa7gjfvi7	409388	ПРАВЕКС-БАНК	PRAVEX-BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u20017iepfofdrexy9	409625	ПРАВЕКС-БАНК	PRAVEX-BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u20018iepfztfrgrny	409881	ПРАВЕКС-БАНК	PRAVEX-BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u20019iepfvihezc0o	461278	ПРАВЕКС-БАНК	PRAVEX-BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u2001aiepft6wovibp	536444	ПРАВЕКС-БАНК	PRAVEX-BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u2001biepf8jzzkk1q	541701	ПРАВЕКС-БАНК	PRAVEX-BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u2001ciepfm95f5r5f	544142	ПРАВЕКС-БАНК	PRAVEX-BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u2001diepf9ul738sl	552670	ПРАВЕКС-БАНК	PRAVEX-BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u2001eiepfvnobu09p	676274	ПРАВЕКС-БАНК	PRAVEX-BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u2001fiepf3lkz9fwz	410653	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u2001giepf3ed52i4p	414949	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u2001hiepfnmkqmu55	414960	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u2001iiepftiqkss2n	414962	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u2001jiepfe3qhmj7r	414963	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u2001kiepftnqauuq3	423396	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u2001liepfoxf58whb	424600	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u2001miepf5u3u754d	432575	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u2001niepfka0y8qbn	434158	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u2001oiepfn62ctqvc	440509	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u2001piepf403khxx6	440535	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u2001qiepf7xtm60dv	440588	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u2001riepfgxo8evb9	458122	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u2001siepff09yc8sd	462708	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u2001tiepf5r7tibdn	473118	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u2001uiepfo510znqq	473121	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u2001viepf91a6hzfr	475538	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u2001wiepfpbhbqttc	476339	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u2001xiepfdpnp9mox	516798	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u2001yiepfeaoh55hk	516874	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u2001ziepflboo3vr9	516875	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u20020iepfhl9qfubb	516933	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u20021iepf7rf3apsf	521153	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u20022iepfqwt33cqu	521857	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u20023iepfcr03qe8r	530217	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u20024iepfd5m5tl6i	532957	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u20025iepfl562d6of	536354	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u20026iepfa8gt1bhb	544457	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u20027iepff0rnisol	545709	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00o3iepfep0yyc83	558422	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u20028iepf73zwwptx	552324	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u20029iepf8joi72jf	558335	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u2002aiepfdcil2aiv	558424	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u2002biepfu9mc83k3	417679	ПроКредит Банк	ProCredit Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u2002ciepfwuxatw6w	433424	ПроКредит Банк	ProCredit Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u2002diepf729li9l7	404170	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u2002eiepfwjwgc11u	406660	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u2002fiepf6ek8fm1z	412717	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u2002giepfea26av8u	419316	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u2002hiepfsbpyw0cl	428337	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u2002iiepfbb1jmgh7	431437	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u2002jiepflx6nvygq	482415	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u2002kiepfenyywdkq	510117	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u2002liepfjzf6ntaq	510536	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u2002miepf90jhl1od	512647	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u2002niepfdchozy2b	516059	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u2002oiepftzcxxezw	516750	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u2002piepf275cgmze	518778	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u2002qiepfyqjxxznx	518985	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u3002riepftr5nxc92	520173	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u3002siepfmmlf6qnt	521327	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u3002tiepfa7d7k4c5	521514	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u3002uiepfoeeek8jn	521762	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u3002viepfwjobo2s6	521832	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u3002wiepf4xfag1v4	523778	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u3002xiepf468dcecq	524729	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u3002yiepf1xba7mbe	524814	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u3002ziepf3cq3qimq	525410	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u30030iepf77bwj6j5	525493	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u30031iepfx90hauw4	526858	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u30032iepf7dlwftvy	530186	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u30033iepfxomc8b0m	530359	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u30034iepfabd7t3n4	533686	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u30035iepfi4hcswxg	533731	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u30036iepfai329pra	537003	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u30037iepf6pbyzifs	538814	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u30038iepfwghokrst	539715	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u30039iepf0ezgjvye	540892	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u3003aiepfvzi7rsxc	540953	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u3003biepf3d99upuu	541271	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u3003ciepfvnvujfc6	542171	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u3003diepfff3zw3de	542521	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u3003eiepfx4jir50q	544044	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u3003fiepf4lrrlse6	544187	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u3003giepfufi6wq40	545219	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u3003hiepf48701yni	547650	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u3003iiepfcdslnzpz	548343	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u3003jiepf7m5xisvo	548919	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u3003kiepfmgubhv0m	549385	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u3003liepfeyl7s6pc	550250	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u3003miepftw84yfwz	552154	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u3003niepfkm20whoz	552611	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u3003oiepfg2frdvv1	553045	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u3003piepf4cfes0kz	553053	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u3003qiepfo5rh16cg	557104	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u3003riepfx6uxayqc	558262	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u3003siepfhpjh0agv	558381	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u3003tiepfdd50m0kc	558591	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u3003uiepfsxtiiuk0	670604	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u3003viepfkzqgmldp	670832	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u3003wiepfqlqaqq2y	676622	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u3003xiepf87e2s6y5	676652	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u3003yiepfsq6wpgvr	676700	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u3003ziepftksuvrxb	677210	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u30040iepf50b04r3n	677567	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u30041iepfgqn6ldr1	677701	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u30042iepfoel4kjoh	413062	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u30043iepfr1azqkzj	414953	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u30044iepfl49pujt5	418844	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u30045iepf07l4l8vx	423843	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u30046iepfu8zvv43s	462775	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u30047iepfdypfaqfa	512070	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u30048iepfwfk09egk	512557	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u40049iepf8gzg17qx	512572	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u4004aiepf77r2mvce	516913	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u4004biepf3k6ygrdx	518808	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u4004ciepf4gx3jve5	529919	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u4004diepflq4q5i3s	532457	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u4004eiepftb9nop1c	535160	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u4004fiepfoncotk97	536502	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u4004giepf9hk3svb6	542465	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u4004hiepfgyuxg8cw	543155	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u4004iiepfsig8ywit	543759	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u4004jiepfwqiln0l2	545253	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u4004kiepfcrpsrywt	548658	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u4004liepfpg2vmv1q	548968	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u4004miepf68p00ntk	552657	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u4004niepft76387o6	557723	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u4004oiepf61wl88cl	557881	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u4004piepfzl2v61bw	403520	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u4004qiepf1pyuo0bh	406337	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u4004riepfk9qp84lq	423297	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u4004siepf52vi7yuk	427705	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u4004tiepf9w917s4j	440272	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u4004uiepf7hqvqz4d	478766	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u4004viepf0y7a5bs8	510140	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u4004wiepf3jowcrqo	515855	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u4004xiepfxj055wbe	516882	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u4004yiepfwwt0i3zw	518720	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u4004ziepf6picqj37	522473	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u40050iepfk7ukclgt	522766	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u40051iepf28ld9zhn	522872	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u40052iepffmdu315u	523473	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u40053iepfj5nn5x0w	524876	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u40054iepf2zu3rkfr	527598	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u40055iepfguzedw17	528953	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u40056iepfwwup9jv6	529801	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u40057iepfo0r05al6	530004	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u40058iepfuq33z0q2	530094	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u40059iepfetbq9kpi	536270	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u4005aiepfszsi1ouj	539897	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u4005biepfl0jeg8he	540381	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u4005ciepf4ueu8pab	540682	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u4005diepf0ia1mg0u	541740	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u4005eiepfbf57j7hh	541940	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u4005fiepf3r3rzqls	542031	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u4005giepf5ctnnskd	543205	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u4005hiepf1p0xs7q3	544510	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u4005iiepflixtawll	547390	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u4005jiepf50qx3suv	547734	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u4005kiepffo0a68b7	547762	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u4005liepf4cjnp13p	548390	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u4005miepftf1ny3o7	548766	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u4005niepfbtewrc9s	550617	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u4005oiepfxvsxjipb	552247	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u4005piepfm72onnc5	552571	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u4005qiepfe2satbmy	552624	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u4005riepfeg5ll879	552735	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u4005siepfd9qkbhr3	553465	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u5005tiepfv6u1i09d	554966	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u5005uiepf282i7pa6	557833	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u5005viepfhss0ud2r	558311	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u5005wiepfmjs3h99h	558797	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u5005xiepfls1y9bw6	676895	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u5005yiepfbhn4jzt9	676965	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u5005ziepfgxc2e7wm	677046	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u50060iepf6jchk0dq	677279	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u50061iepf4x3ellbh	677325	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u50062iepf6b5ujhjg	677613	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u50063iepfpdd9uf7l	401800	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u50064iepfdp0g0cpo	403471	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u50065iepfxftr5ejf	510449	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u50066iepfh99nrdk8	512100	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u50067iepfhrhbe8ro	512743	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u50068iepfpo3posno	516854	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u50069iepfy9kjpzio	517725	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u5006aiepf5plqu0dv	517818	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u5006biepfzrnehmiq	518654	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u5006ciepfjy5xm5dx	521833	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u5006diepfar38ab6s	522654	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u5006eiepfm7awe32w	522797	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u5006fiepfyavamqwv	522967	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u5006giepfvsnnsmuw	524872	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u5006hiepfpcj8fsh1	525672	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u5006iiepf1lng8t0k	525792	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u5006jiepfefv2vkx7	527412	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u5006kiepfzzu8ah7m	528812	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u5006liepfasm5qno1	531007	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u5006miepfsx8ik1lz	531725	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u5006niepfkxu4ppp0	532343	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u5006oiepffo0ivkz0	539845	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u5006piepf9n898vtv	540305	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u5006qiepffbsps6mw	540617	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u5006riepf0dyrh18e	540637	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u5006siepflsv1eaea	543438	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u5006tiepfbo14enh4	547313	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u5006uiepfxze9l3nu	547914	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u5006viepfl9nszuc7	548883	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u5006wiepfjb640196	549146	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u5006xiepf7d42tx8q	549582	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u5006yiepfnrs9hvty	549824	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u5006ziepfeyl33gyc	549896	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u50070iepf2n1cfi80	553391	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u50071iepf0r8ljrsr	557110	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u50072iepfccj0oq32	670651	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u50073iepfgcpw9oox	670669	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u50074iepf7y5ocvwk	670877	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u50075iepfvucgsb03	671103	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u50076iepf81pfs4fp	677237	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u50077iepfneyyypub	677490	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u50078iepfafoahrl6	407361	УКРСИББАНК	Ukrsibbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u50079iepfjnuw7up0	407368	УКРСИББАНК	Ukrsibbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u5007aiepfscqos2tz	417232	УКРСИББАНК	Ukrsibbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u6007biepflzcv5xyi	427830	УКРСИББАНК	Ukrsibbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u6007ciepfd0ypc3f4	434343	УКРСИББАНК	Ukrsibbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u6007diepfp0jaxa5p	516930	УКРСИББАНК	Ukrsibbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u6007eiepfbneqpg4r	529578	УКРСИББАНК	Ukrsibbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u6007fiepfudxovm22	533037	УКРСИББАНК	Ukrsibbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u6007giepfoakbgvzr	535129	УКРСИББАНК	Ukrsibbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u6007hiepfpqm6e2j6	402191	Укрсоцбанк	Ukrsotsbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u6007iiepfhx4908h6	417284	Укрсоцбанк	Ukrsotsbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u6007jiepfr6dir1sv	431153	Укрсоцбанк	Ukrsotsbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u6007kiepfterz9njm	476009	Укрсоцбанк	Ukrsotsbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u6007liepfartuj1qn	487412	Укрсоцбанк	Ukrsotsbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u6007miepfwkxvxzm0	408339	ЮниКредит Банк	UniCredit Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u6007niepf6fd2we9c	430333	ЮниКредит Банк	UniCredit Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u6007oiepfxiukgxe5	430364	ЮниКредит Банк	UniCredit Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u6007piepfjryzzs6i	432109	ЮниКредит Банк	UniCredit Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u6007qiepfggncgr6k	487410	ЮниКредит Банк	UniCredit Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u6007riepfgffvnwdg	510467	ЮниКредит Банк	UniCredit Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u6007siepfgdjy2cb1	512789	ЮниКредит Банк	UniCredit Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u6007tiepfgiyvgquc	515794	ЮниКредит Банк	UniCredit Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u6007uiepfytuggc0x	518282	ЮниКредит Банк	UniCredit Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u6007viepf8nhvfmk1	525759	ЮниКредит Банк	UniCredit Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u6007wiepfh09x1gxw	546644	ЮниКредит Банк	UniCredit Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u6007xiepf0s76g9wk	553091	ЮниКредит Банк	UniCredit Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u6007yiepf7ddh3bmk	444111	Монобанк	Monobank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u6007ziepf1z5zdau2	537541	Монобанк	Monobank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u60080iepfp6c7xlfw		А-Банк	AKTSENT BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u60081iepfw5w8aas1	535507	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u60082iepftt3x4h3k	414943	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u60083iepfk3puiw9l	421113	БАНК КРЕДИТ ДНЕПР	CREDIT-DNEPR	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u60084iepfpkgvfkh3	535466	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u60085iepft5k1qxj5	414950	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u60086iepfgnjps9a8	516749	Ощадбанк	Oschadbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u60087iepf5bg7a1kt	536639	ТАСКОМБАНК	TASCOMBANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u60088iepf8krycrhx	516936	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u60089iepfkdobp78n	410245	Альфа-Банк	Alfa-Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u6008aiepf9w4ida4t	430653	Ощадбанк	Oschadbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u6008biepfopye3jtl	545708	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u6008ciepfw56m98ug	535249	ТАСКОМБАНК	TASCOMBANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u6008diepfht5mrkwz	439023	Креді Агріколь Банк	Credit Agricole	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u6008eiepfcd59bypt	418837	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u6008fiepfjwlx46kj	535557	Альфа-Банк	Alfa-Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u6008giepfpuxljj95	410232	Альфа-Банк	Alfa-Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u6008hiepffzncn788	479070	ТАСКОМБАНК	TASCOMBANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u6008iiepf1qv0x2ye	535528	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u6008jiepfh4alnhrk	516915	А-Банк	AKTSENT BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u6008kiepf9cyx90o4	414951	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u6008liepfqtlcggfs	516887	OTP Bank	OTP Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u6008miepfbpf1x2jk	479082	Ощадбанк	Oschadbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u6008niepfmg7ddp7e	516818	БАНК ВОСТОК	Bank Vostok	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u6008oiepfb8j7immg	516783	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u6008piepf8o30scgm	440271	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u6008qiepfwyg7tif1	535465	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u6008riepfs236u3jw	535432	УКРСИББАНК	Ukrsibbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u6008siepf3yb8tuqj	467808	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u6008tiepfl2ms3pg2	535136	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u7008uiepfvzd9fzu2	510094	OTP Bank	OTP Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u7008viepfbcltmj9e	479751	OTP Bank	OTP Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u7008wiepfpwjmt557	403021	КОНКОРД	CONCORD	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u7008xiepffumepxv6	537598	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u7008yiepfqy6x0luq	516939	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u7008ziepfncmnwx5z	402901	Полтава-банк	POLTAVA BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u70090iepf9t19kxu3	670635	Ощадбанк	Oschadbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u70091iepfn137z080	535517	Кредобанк	KredoBank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u70092iepfcu5n4k76	431414	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u70093iepfnfexg19h	428308	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u70094iepflj6jv04f	413281	КЛІРИНГОВИЙ ДІМ	CLEARING HOUSE	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u70095iepfumihnt32	411997	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u70096iepffabt00db	431403	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u70097iepfephcubp1	479072	Ощадбанк	Oschadbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u70098iepfigxa4izi	413418	ТАСКОМБАНК	TASCOMBANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u70099iepfogdj81hf	516800	Альфа-Банк	Alfa-Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u7009aiepfbzaof1na	432335	А-Банк	AKTSENT BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u7009biepfhwl5bx5f	537523	А-Банк	AKTSENT BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u7009ciepfgp2m1erq	516812	БАНК ВОСТОК	Bank Vostok	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u7009diepfeqx0k5ch	516780	Ощадбанк	Oschadbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u7009eiepf7mhaff56	516754	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u7009fiepfxifzx86p	414941	Монобанк	Monobank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u7009giepfn5tth94c	516759	Креді Агріколь Банк	Credit Agricole	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u7009hiepfmov8kdud	414939	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u7009iiepfohmwqesp	496680	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u7009jiepfs7c7ktib	516791	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u7009kiepfhx0c3qeu	420366	Банк Богуслав	BANK BOHUSLAV	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u7009liepfm8igugnv	420367	Банк Богуслав	BANK BOHUSLAV	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u7009miepfnncs8iz8	420368	Банк Богуслав	BANK BOHUSLAV	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u7009niepf96ygzb76	420369	Банк Богуслав	BANK BOHUSLAV	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u7009oiepfhginsfud	413051	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u7009piepfp1g7x1vn	414961	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u7009qiepfnhcbl8pj	417649	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u7009riepfqnuurp6j	424657	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u7009siepfqq0as4ba	434156	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u7009tiepfb5a14l49	458121	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u7009uiepfmnkek8lb	462705	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u7009viepf6wvyrhos	473117	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u7009wiepfgnmf2h8m	476065	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u7009xiepfzvz2sgrf	456095	Ситибанк	CITIBANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u7009yiepfl1dastmi	456096	Ситибанк	CITIBANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u7009ziepfvyjrhzsy	456097	Ситибанк	CITIBANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u700a0iepfo5vimqze	456098	Ситибанк	CITIBANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u700a1iepf1gzhhozj	432336	А-Банк	AKTSENT BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u700a2iepf6ri3qb65	432337	А-Банк	AKTSENT BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u700a3iepffxvbjs2p	432338	А-Банк	AKTSENT BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u700a4iepfcufpxv29	432339	А-Банк	AKTSENT BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u700a5iepfiq9mhrof	432340	А-Банк	AKTSENT BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u700a6iepfm4s1sajo	427218	Альфа-Банк	Alfa-Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u700a7iepfda62wmmj	442167	Альфа-Банк	Alfa-Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u700a8iepfdfz0tqa1	417352	БАНК ВОСТОК	Bank Vostok	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u700a9iepfb6z7mn9r	421855	БАНК ВОСТОК	Bank Vostok	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u700aaiepfiwu6uqb1	445488	КРЕДИТВЕСТ БАНК	Creditwest Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u700abiepfuo81ra8c	413282	КЛІРИНГОВИЙ ДІМ	CLEARING HOUSE	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u700aciepfqr27kw2i	413283	КЛІРИНГОВИЙ ДІМ	CLEARING HOUSE	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u700adiepf9k807v3i	413284	КЛІРИНГОВИЙ ДІМ	CLEARING HOUSE	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u700aeiepfssyplte4	484173	КЛІРИНГОВИЙ ДІМ	CLEARING HOUSE	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u700afiepfp0543w0c	413285	КЛІРИНГОВИЙ ДІМ	CLEARING HOUSE	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u700agiepfscst0pbc	423394	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u700ahiepf61ttgy9z	423395	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u700aiiepfeo5t11vu	434157	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u700ajiepfukfl4r3n	458120	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u700akiepfet55cy6b	473119	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u700aliepfeawwr4r1	429714	Індустріалбанк	INDUSTRIAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u700amiepfo2gbw805	421114	БАНК КРЕДИТ ДНЕПР	CREDIT-DNEPR	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u700aniepfee2e186d	421115	БАНК КРЕДИТ ДНЕПР	CREDIT-DNEPR	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u700aoiepf0sdwj36h	421116	БАНК КРЕДИТ ДНЕПР	CREDIT-DNEPR	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u700apiepfl1woajk3	421117	БАНК КРЕДИТ ДНЕПР	CREDIT-DNEPR	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u700aqiepffm9dey5g	424349	БАНК КРЕДИТ ДНЕПР	CREDIT-DNEPR	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u700ariepf0mb5icvk	471419	БАНК КРЕДИТ ДНЕПР	CREDIT-DNEPR	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u700asiepfhlosaw4r	401856	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800atiepfz4sjlfn9	406659	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800auiepfo0j82nbb	416926	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800aviepf9a9n18c3	419313	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800awiepfrwty3c1s	419314	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800axiepf9wzlgb9m	419315	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800ayiepfuzt6txg9	431435	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800aziepfs7ktugtu	431436	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800b0iepfa8s7pyqo	486819	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800b1iepf4d2jf148	486820	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800b2iepfa5zalv4n	487424	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800b3iepfscbrwq9o	406115	Форвард Банк	FORWARD BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800b4iepfn795hmo8	406116	Форвард Банк	FORWARD BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800b5iepfe6uj10h3	406117	Форвард Банк	FORWARD BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800b6iepfk3earrul	424173	Індустріалбанк	INDUSTRIAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800b7iepfdry100cm	424174	Індустріалбанк	INDUSTRIAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800b8iepfphjd7wfv	424175	Індустріалбанк	INDUSTRIAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800b9iepftqzc2enm	424176	Індустріалбанк	INDUSTRIAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800baiepfrqrlkm01	424177	Індустріалбанк	INDUSTRIAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800bbiepfmx5ng7iz	427767	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800bciepfz13njfzf	433341	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800bdiepf2nmx7woh	487407	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800beiepfvij34ure	431184	Індустріалбанк	INDUSTRIAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800bfiepf4975btuf	431186	Індустріалбанк	INDUSTRIAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800bgiepfn743jar4	431187	Індустріалбанк	INDUSTRIAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800bhiepfb4gkia7y	431188	Індустріалбанк	INDUSTRIAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800biiepfopftuz1i	407367	УКРСИББАНК	Ukrsibbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800bjiepfxbbwe8w1	429450	Діамантбанк	Diamantbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800bkiepfze3ixqmn	429451	Діамантбанк	Diamantbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800bliepfk41wn0a3	429452	Діамантбанк	Diamantbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800bmiepfzn4lzq5e	400629	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800bniepfu08ts850	402961	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800boiepfvrv3hy1h	402962	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800bpiepfmarujz7u	402963	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800bqiepfcfafalaj	402964	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800briepfcp8xl74d	404020	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800bsiepftf8opz84	429966	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800btiepfbthdth5k	429967	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800buiepfhb3rezrn	429968	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800bviepf52tkx22j	430270	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800bwiepfy2xpfd7v	448393	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800bxiepfaukpnnlp	448394	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800byiepft9d5l3k7	448780	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800bziepfjxpytv20	465368	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800c0iepf7cqss999	465369	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800c1iepfc75iqatf	465370	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800c2iepfdv6m0ecm	489175	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800c3iepfzuwaltwz	402902	Полтава-банк	POLTAVA BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800c4iepfg1hif6xy	402903	Полтава-банк	POLTAVA BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800c5iepfqki33ple	402904	Полтава-банк	POLTAVA BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800c6iepfp9wcymxx	424171	Індустріалбанк	INDUSTRIAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800c7iepfe1cnjy11	435570	Індустріалбанк	INDUSTRIAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800c8iepfce0g8x96	477990	Індустріалбанк	INDUSTRIAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800c9iepf15udol6h	477991	Індустріалбанк	INDUSTRIAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800caiepfixkqt2cd	477992	Індустріалбанк	INDUSTRIAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800cbiepff8gltj6n	477993	Індустріалбанк	INDUSTRIAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800cciepf0n7wvgaq	402511	Індустріалбанк	INDUSTRIAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800cdiepfkw12b9s7	424172	Кредобанк	KredoBank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800ceiepf4wj44u1p	432457	Кредобанк	KredoBank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800cfiepf8hl854uk	432458	Кредобанк	KredoBank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800cgiepf911ghdmk	432459	Кредобанк	KredoBank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800chiepf7xwdzm86	435624	Піреус Банк	PIRAEUS BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800ciiepf8j9icxaq	435625	Піреус Банк	PIRAEUS BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800cjiepfcgxuqsqh	420470	Ощадбанк	Oschadbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800ckiepfrcgc2ksv	429552	Ощадбанк	Oschadbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800cliepfz1xnp5x9	435235	Ощадбанк	Oschadbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800cmiepf6p402x0h	438927	Ощадбанк	Oschadbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800cniepfe8g36589	452437	Ощадбанк	Oschadbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800coiepfqqctlfz9	457635	Ощадбанк	Oschadbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800cpiepftj2en1io	457636	Ощадбанк	Oschadbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800cqiepfonmj36fj	457639	Ощадбанк	Oschadbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800criepf81qcyg2z	457640	Ощадбанк	Oschadbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800csiepfbjf7uos3	479088	Ощадбанк	Oschadbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800ctiepfmyjxk4dn	479093	Ощадбанк	Oschadbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800cuiepfu6sz2uek	479094	Ощадбанк	Oschadbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800cviepf97cyr4hv	479095	Ощадбанк	Oschadbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800cwiepfgrlwt45w	479096	Ощадбанк	Oschadbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u800cxiepfxsihcpff	430362	ЮниКредит Банк	UniCredit Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900cyiepf05malu99	430363	ЮниКредит Банк	UniCredit Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900cziepf0z5pic8g	430365	ЮниКредит Банк	UniCredit Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900d0iepfstcfze3a	444232	Індустріалбанк	INDUSTRIAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900d1iepfvbhqrxgi	444233	Індустріалбанк	INDUSTRIAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900d2iepfy0ks0mj5	444234	Індустріалбанк	INDUSTRIAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900d3iepfgrvt4r3r	444235	Індустріалбанк	INDUSTRIAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900d4iepfpjpxgkfh	444236	Індустріалбанк	INDUSTRIAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900d5iepfkr84g5xg	444237	Індустріалбанк	INDUSTRIAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900d6iepfrgxndla6	444900	Індустріалбанк	INDUSTRIAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900d7iepf5zj8hp4w	471221	Індустріалбанк	INDUSTRIAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900d8iepfp2jb32x1	409880	ПРАВЕКС-БАНК	PRAVEX-BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900d9iepfmd27bgco	461275	ПРАВЕКС-БАНК	PRAVEX-BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900daiepfmewpmsuw	404877	БАНК ФАМІЛЬНИЙ	BANK FAMILNY	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900dbiepf0l1tnkqe	404878	БАНК ФАМІЛЬНИЙ	BANK FAMILNY	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900dciepf7evupfhw	404879	БАНК ФАМІЛЬНИЙ	BANK FAMILNY	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900ddiepf04t6z4r3	404880	БАНК ФАМІЛЬНИЙ	BANK FAMILNY	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900deiepffg3k14up	487485	Національний банк України	NATIONAL BANK OF UKRAINE	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900dfiepfx2u93w4s	402889	Универсал Банк	UNIVERSAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900dgiepfl2oj51xk	438383	Универсал Банк	UNIVERSAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900dhiepfd2i8zoq5	444036	Универсал Банк	UNIVERSAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900diiepflzu2d50z	444037	Универсал Банк	UNIVERSAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900djiepfy7aat85i	444038	Универсал Банк	UNIVERSAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900dkiepfgf4bzidt	444039	Универсал Банк	UNIVERSAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900dliepfwe3286ln	444040	Универсал Банк	UNIVERSAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900dmiepfq8qd427i	444041	Универсал Банк	UNIVERSAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900dniepfpyt198jx	444042	Универсал Банк	UNIVERSAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900doiepfn0zvxcci	472931	Универсал Банк	UNIVERSAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900dpiepfutxbvs3j	472932	Универсал Банк	UNIVERSAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900dqiepf6h0n6cjq	410332	ПЕРШИЙ ІНВЕСТИЦІЙНИЙ БАНК	FIRST INVESTMENT BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900driepfszkrwwec	424511	ПЕРШИЙ ІНВЕСТИЦІЙНИЙ БАНК	FIRST INVESTMENT BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900dsiepfyysko7eo	438146	ПЕРШИЙ ІНВЕСТИЦІЙНИЙ БАНК	FIRST INVESTMENT BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900dtiepfve2dcutx	438147	ПЕРШИЙ ІНВЕСТИЦІЙНИЙ БАНК	FIRST INVESTMENT BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900duiepfn30qo7gd	438148	ПЕРШИЙ ІНВЕСТИЦІЙНИЙ БАНК	FIRST INVESTMENT BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900dviepfgejjruux	438150	ПЕРШИЙ ІНВЕСТИЦІЙНИЙ БАНК	FIRST INVESTMENT BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900dwiepf57n6nhko	445586	МОТОР-БАНК	MOTOR BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900dxiepfv3xg8h4o	445587	МОТОР-БАНК	MOTOR BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900dyiepfe3fk2i2k	406759	OTP Bank	OTP Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900dziepfnel4erae	410336	OTP Bank	OTP Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900e0iepfoch3o3n8	410337	OTP Bank	OTP Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900e1iepfa8r0lstk	416954	OTP Bank	OTP Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900e2iepfvtsikr30	402808	Альфа-Банк	Alfa-Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900e3iepf2j0o7gqc	406622	Альфа-Банк	Alfa-Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900e4iepfmesi0gmt	410242	Альфа-Банк	Alfa-Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900e5iepfsgrpzmdx	410243	Альфа-Банк	Alfa-Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900e6iepf9m8v9wmw	410244	Альфа-Банк	Alfa-Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900e7iepfv9kffh7o	410246	Альфа-Банк	Alfa-Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900e8iepfd2m1he4e	444424	Альфа-Банк	Alfa-Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900e9iepf1c6mgnce	446670	Альфа-Банк	Alfa-Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900eaiepf8njq23uo	466065	Альфа-Банк	Alfa-Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900ebiepfwrfxgkwl	457733	БАНК 3/4	BANK 3/4	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900eciepfg3ezeun2	457734	БАНК 3/4	BANK 3/4	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900ediepfjf0mbh3m	457735	БАНК 3/4	BANK 3/4	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900eeiepfk9164y6i	457736	БАНК 3/4	BANK 3/4	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900efiepf6eogdkwj	419323	БАНК ІНВЕСТИЦІЙ ТА ЗАОЩАДЖЕНЬ	BANK FOR INVESTMENTS AND SAVINGS	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900egiepflfa1knel	419324	БАНК ІНВЕСТИЦІЙ ТА ЗАОЩАДЖЕНЬ	BANK FOR INVESTMENTS AND SAVINGS	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900ehiepfvm6i52ny	419325	БАНК ІНВЕСТИЦІЙ ТА ЗАОЩАДЖЕНЬ	BANK FOR INVESTMENTS AND SAVINGS	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900eiiepfhb7g6p2w	419326	БАНК ІНВЕСТИЦІЙ ТА ЗАОЩАДЖЕНЬ	BANK FOR INVESTMENTS AND SAVINGS	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900ejiepfejkyaaz1	419327	БАНК ІНВЕСТИЦІЙ ТА ЗАОЩАДЖЕНЬ	BANK FOR INVESTMENTS AND SAVINGS	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900ekiepfkpmv8otd	458215	БАНК ІНВЕСТИЦІЙ ТА ЗАОЩАДЖЕНЬ	BANK FOR INVESTMENTS AND SAVINGS	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900eliepf1jx09k23	422675	БТА БАНК	BTA BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900emiepf4qu1n55l	444801	БТА БАНК	BTA BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900eniepfr6l2z33m	444802	БТА БАНК	BTA BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900eoiepf5294q580	444803	БТА БАНК	BTA BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900epiepfiuxk0fk2	444804	БТА БАНК	BTA BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900eqiepfe574goqm	444805	БТА БАНК	BTA BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900eriepfu7fky20v	404275	ПРАВЕКС-БАНК	PRAVEX-BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900esiepfls1td5r4	409624	ПРАВЕКС-БАНК	PRAVEX-BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6u900etiepf6pj9mq4a	409879	ПРАВЕКС-БАНК	PRAVEX-BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00euiepfmjid5zfo	439049	ПРАВЕКС-БАНК	PRAVEX-BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00eviepfhz0gpryz	461274	ПРАВЕКС-БАНК	PRAVEX-BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00ewiepfkn2l63gk	461276	ПРАВЕКС-БАНК	PRAVEX-BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00exiepffahehbhb	461277	ПРАВЕКС-БАНК	PRAVEX-BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00eyiepfyqoykg9s	411872	Індустріалбанк	INDUSTRIAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00eziepficlbr7t4	417395	Креді Агріколь Банк	Credit Agricole	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00f0iepf1awl8165	439024	Креді Агріколь Банк	Credit Agricole	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00f1iepf8udzsl9y	439025	Креді Агріколь Банк	Credit Agricole	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00f2iepfw0fhkjmy	439038	Креді Агріколь Банк	Credit Agricole	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00f3iepfwuohhd79	439039	Креді Агріколь Банк	Credit Agricole	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00f4iepf7dza30lk	406989	Идея Банк	IDEA BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00f5iepfzlfuf50b	457732	Идея Банк	IDEA BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00f6iepf5nklhfnq	457856	Идея Банк	IDEA BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00f7iepf510rxfha	402631	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00f8iepfwnrwxplw	402632	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00f9iepftnw1293e	402633	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00faiepf1pig4vu2	402634	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00fbiepf0ovbttjl	406980	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00fciepfo72kigsa	415840	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00fdiepfy1rdrc1p	429943	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00feiepf1s0u2afk	484772	Банк Львів	LVIV	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00ffiepfrfz2gtc0	484773	Банк Львів	LVIV	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00fgiepf4k2hz3le	484774	Банк Львів	LVIV	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00fhiepfm5g0mgxx	484775	Банк Львів	LVIV	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00fiiepf6xuqpmu2	428615	ТРАСТ-КАПИТАЛ	TRUST-CAPITAL	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00fjiepfoytg848o	428616	ТРАСТ-КАПИТАЛ	TRUST-CAPITAL	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00fkiepf2n0we5yd	428617	ТРАСТ-КАПИТАЛ	TRUST-CAPITAL	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00fliepfr52abmko	428618	ТРАСТ-КАПИТАЛ	TRUST-CAPITAL	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00fmiepfdt0jf7pb	402454	МТБ БАНК	MARFIN BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00fniepfiozhjz8k	426046	МТБ БАНК	MARFIN BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00foiepf64gzew3o	426047	МТБ БАНК	MARFIN BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00fpiepfvzgy83ud	426048	МТБ БАНК	MARFIN BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00fqiepf2l7ca2p6	426049	МТБ БАНК	MARFIN BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00friepfqu7uz9ve	429732	МТБ БАНК	MARFIN BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00fsiepfgzy1cjb4	429733	МТБ БАНК	MARFIN BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00ftiepfz9a749xb	457705	Піреус Банк	PIRAEUS BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00fuiepf0ch55ri4	457706	Піреус Банк	PIRAEUS BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00fviepfwwglyccn	472472	Піреус Банк	PIRAEUS BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00fwiepf1pu73vuf	472473	Піреус Банк	PIRAEUS BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00fxiepfr75khm1u	472474	Піреус Банк	PIRAEUS BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00fyiepf9pjf1ps1	472475	Піреус Банк	PIRAEUS BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00fziepfgoydlkhl	472282	ТАСКОМБАНК	TASCOMBANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00g0iepfq8181uwj	429965	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00g1iepfwc29a6q5	431222	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00g2iepfex76yao3	431223	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00g3iepfsiqjmu3y	407360	УКРСИББАНК	Ukrsibbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00g4iepfumq878ic	407362	УКРСИББАНК	Ukrsibbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00g5iepf6wg9sp92	407363	УКРСИББАНК	Ukrsibbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00g6iepf2d1xw3dw	407364	УКРСИББАНК	Ukrsibbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00g7iepff59tih0t	407365	УКРСИББАНК	Ukrsibbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00g8iepflp0rs8fx	407366	УКРСИББАНК	Ukrsibbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ua00g9iepf9yyvau2n	417675	ПроКредит Банк	ProCredit Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00gaiepfi7db9wpz	433423	ПроКредит Банк	ProCredit Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00gbiepf62b70dy1	477994	Проминвестбанк	PROMINVESTBANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00gciepf7utw4xpw	477995	Проминвестбанк	PROMINVESTBANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00gdiepf09840rlc	421090	Проминвестбанк	PROMINVESTBANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00geiepfs9jqx7lh	403304	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00gfiepfshrvzbrx	414952	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00ggiepfp0hwz02v	423922	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00ghiepf4a4fv8ol	460160	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00giiepfamocttnl	462773	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00gjiepfyblnn8ov	462774	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00gkiepfo7izqh79	464169	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00gliepfzn0ywitq	467809	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00gmiepfbakak5pm	478389	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00gniepfcox1q892	493191	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00goiepfn33mmlne	440297	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00gpiepfvpxtyqbp	454644	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00gqiepfzlt5kglv	413416	ТАСКОМБАНК	TASCOMBANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00griepfez62a9w6	413417	ТАСКОМБАНК	TASCOMBANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00gsiepfhh6ac3ei	431221	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00gtiepf5kwugq26	400644	ЮНЕКС БАНК	UNEX BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00guiepfdu45vjfn	410361	ЮНЕКС БАНК	UNEX BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00gviepflxrjsdes	410362	ЮНЕКС БАНК	UNEX BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00gwiepfoztlzy28	410363	ЮНЕКС БАНК	UNEX BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00gxiepf65hcv1yn	410383	ЮНЕКС БАНК	UNEX BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00gyiepf905wkkgp	516797	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00gziepf1gz2p7p2	516825	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00h0iepfjaspbjga	516916	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00h1iepf8cgtonl9	516917	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00h2iepfo2rsfrz3	516918	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00h3iepfvr8jka3r	521432	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00h4iepfupafnb7l	535128	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00h5iepfbutmbvg5	542447	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00h6iepfud9ym1lq	557387	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00h7iepfwe37cr3g	544032	Індустріалбанк	INDUSTRIAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00h8iepfdqzago48	544072	Індустріалбанк	INDUSTRIAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00h9iepfaubljtly	547434	Індустріалбанк	INDUSTRIAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00haiepfnnpkrg2a	516773	Креді Агріколь Банк	Credit Agricole	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00hbiepfv2qe7koj	517396	Креді Агріколь Банк	Credit Agricole	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00hciepfdevkxtyc	528806	Креді Агріколь Банк	Credit Agricole	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00hdiepf80e8c4vp	545172	Креді Агріколь Банк	Credit Agricole	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00heiepftqijc5ww	511782	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00hfiepfkhz4hqta	516089	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00hgiepfytcr8b5j	516807	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00hhiepfnh4e09rw	516864	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00hiiepfm35g4j8x	516865	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00hjiepf43a8tt6w	516866	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00hkiepfpjxcl2tk	535173	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00hliepf4zjsalxp	535862	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00hmiepfpe1dovqo	537478	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00hniepfpvsfpbye	538178	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00hoiepf4rfxw5dw	542435	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00hpiepfczagwncl	516760	Діамантбанк	Diamantbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00hqiepfy8f1ldw7	535252	Діамантбанк	Diamantbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00hriepfre96dw52	547755	Діамантбанк	Diamantbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00hsiepfkgkm1u15	510104	Індустріалбанк	INDUSTRIAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00htiepfdeufud3o	510105	Індустріалбанк	INDUSTRIAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00huiepfoukalv0q	513999	Індустріалбанк	INDUSTRIAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00hviepfr2l96vm4	523933	Індустріалбанк	INDUSTRIAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00hwiepfzal8a0l8	515768	Кредобанк	KredoBank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00hxiepf3h7h90mi	516801	Кредобанк	KredoBank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00hyiepf5f4vtf3y	516802	Кредобанк	KredoBank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00hziepfwd70aoln	516803	Кредобанк	KredoBank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00i0iepfwoqr4op0	516804	Кредобанк	KredoBank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00i1iepfvmxb3c95	520143	Кредобанк	KredoBank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00i2iepfeyfu3vwm	535134	Кредобанк	KredoBank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00i3iepf8p2vmzw8	535556	Кредобанк	KredoBank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00i4iepfn0offp6l	545164	Кредобанк	KredoBank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00i5iepfuxvyzpye	557103	Кредобанк	KredoBank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00i6iepfhg1odpji	510477	Ощадбанк	Oschadbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00i7iepf548c4ppl	516781	Ощадбанк	Oschadbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00i8iepfm4js0lpg	517474	Ощадбанк	Oschadbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00i9iepfowf43ak8	523406	Ощадбанк	Oschadbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ub00iaiepfjcnrkos9	524608	Ощадбанк	Oschadbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00ibiepfckhtfio2	527410	Ощадбанк	Oschadbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00iciepffb1d3iya	530409	Ощадбанк	Oschadbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00idiepfjgeaivin	530778	Ощадбанк	Oschadbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00ieiepfyxe26kdy	531965	Ощадбанк	Oschadbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00ifiepfn3xqki4v	535206	Ощадбанк	Oschadbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00igiepfzm2w6d67	549022	Ощадбанк	Oschadbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00ihiepfb672n0x2	542667	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00iiiepfy5so2i6i	516958	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00ijiepf6iosehf6	527464	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00ikiepfg9s9ph20	529039	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00iliepfdqvpbsgh	532015	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00imiepfob52sn1p	532099	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00iniepfqyibvbkk	534485	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00ioiepfm2ezp5bl	534612	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00ipiepf8nhsiljn	535044	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00iqiepf89kopji8	535215	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00iriepfxluiqnok	535216	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00isiepf0cknea5c	535305	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00itiepf46my32rz	545239	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00iuiepfgqjtoc8m	545784	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00iviepfy1xztq6h	545808	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00iwiepfujvst55o	547603	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00ixiepf4wywifkn	548855	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00iyiepfi6qaafmv	559269	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00iziepfxcnc54x6	516870	Індустріалбанк	INDUSTRIAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00j0iepf1cr8nwek	516890	Індустріалбанк	INDUSTRIAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00j1iepf2bs2wt3k	516928	Індустріалбанк	INDUSTRIAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00j2iepftwxsf2jc	516946	Індустріалбанк	INDUSTRIAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00j3iepfdsngrtml	557844	ІНГ Банк Україна	ING BANK UKRAINE	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00j4iepf6miwkwkl	557845	ІНГ Банк Україна	ING BANK UKRAINE	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00j5iepf7vska3it	524487	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00j6iepfezmjt4b9	525691	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00j7iepftmgi86g9	525779	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00j8iepfuuaydbjx	526763	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00j9iepfvwbn7t4i	528459	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00jaiepf7gfghhpl	528472	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00jbiepf9xat5867	534587	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00jciepfj90cvqc6	557442	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00jdiepfb8yjm0w6	557443	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00jeiepf1z504b3j	557444	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00jfiepfo4xdbokw	534422	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00jgiepffwh3oxu1	534625	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00jhiepforbi8p9t	536085	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00jiiepfjlsw3obm	557393	Пивденный	Pivdennyi	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00jjiepfnriwdf9m	545264	Ощадбанк	Oschadbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00jkiepfpt0e4h6p	547625	Ощадбанк	Oschadbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00jliepfh8enjo4u	521398	Универсал Банк	UNIVERSAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00jmiepf8ujor95y	537571	Универсал Банк	UNIVERSAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00jniepfaj7hbcp8	538808	Универсал Банк	UNIVERSAL BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00joiepfdoivmpyv	510093	OTP Bank	OTP Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00jpiepfstozk8ra	522864	OTP Bank	OTP Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00jqiepf0a04kxnm	517268	БАНК КРЕДИТ ДНЕПР	CREDIT-DNEPR	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00jriepfxhezyegl	517944	БАНК КРЕДИТ ДНЕПР	CREDIT-DNEPR	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00jsiepfo0q4c4h5	557814	БАНК КРЕДИТ ДНЕПР	CREDIT-DNEPR	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00jtiepfruce48kh	557815	БАНК КРЕДИТ ДНЕПР	CREDIT-DNEPR	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00juiepf0wxt64sp	558327	БАНК КРЕДИТ ДНЕПР	CREDIT-DNEPR	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00jviepfjk0kl47z	559644	БАНК КРЕДИТ ДНЕПР	CREDIT-DNEPR	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00jwiepfkb1pja4f	516822	Форвард Банк	FORWARD BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00jxiepfofxj8gau	517464	Форвард Банк	FORWARD BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00jyiepfwlqmqc0f	521364	Форвард Банк	FORWARD BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00jziepfop18h2sm	522064	Форвард Банк	FORWARD BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00k0iepffxyvzd37	523530	Форвард Банк	FORWARD BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00k1iepf3vcubxid	536401	Форвард Банк	FORWARD BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00k2iepfcj2c9379	549287	Форвард Банк	FORWARD BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00k3iepfe8radx08	549313	Форвард Банк	FORWARD BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00k4iepf5cfpegc3	516813	БАНК ВОСТОК	Bank Vostok	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00k5iepf9mz7w7td	517328	БАНК ВОСТОК	Bank Vostok	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00k6iepfr4b0f3p6	522847	БАНК ВОСТОК	Bank Vostok	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00k7iepfq81f0r6m	523502	БАНК ВОСТОК	Bank Vostok	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00k8iepfno22cioi	526485	БАНК ВОСТОК	Bank Vostok	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uc00k9iepf5i529ual	535189	БАНК ВОСТОК	Bank Vostok	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00kaiepfxoq6rgm9	535190	БАНК ВОСТОК	Bank Vostok	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00kbiepfb3dn5kqo	535191	БАНК ВОСТОК	Bank Vostok	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00kciepfoq6s246v	535255	БАНК ВОСТОК	Bank Vostok	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00kdiepfz9v4w9wa	542996	БАНК ВОСТОК	Bank Vostok	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00keiepf4rmwk1yw	544649	БАНК ВОСТОК	Bank Vostok	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00kfiepfkq4fe5lw	552717	БАНК ВОСТОК	Bank Vostok	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00kgiepfi3nej9xw	557740	БАНК ВОСТОК	Bank Vostok	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00khiepf2r1o95xr	516855	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00kiiepf8gqhzc0t	516856	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00kjiepfbft35mvi	516859	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00kkiepfn75r5fik	516860	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00kliepfkmmuvfiz	516941	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00kmiepfvuaywlc9	535289	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00kniepf5lcpr9yj	549338	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00koiepf7guizebz	550215	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00kpiepfalyn9she	544667	Піреус Банк	PIRAEUS BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00kqiepfmd739gn2	516799	Альфа-Банк	Alfa-Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00kriepfozwh67rp	530565	Альфа-Банк	Alfa-Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00ksiepf3q9hljuu	531854	Альфа-Банк	Alfa-Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00ktiepfvb24d2b1	535196	Альфа-Банк	Alfa-Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00kuiepfy2i9zth7	535555	Альфа-Банк	Alfa-Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00kviepfrek80srg	544179	Альфа-Банк	Alfa-Bank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00kwiepfo0l9i4hd	512785	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00kxiepflo3n0dal	515791	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00kyiepf078rwkvw	515829	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00kziepfwqaydobi	516768	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00l0iepfjdltk1sq	516853	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00l1iepfa11008z3	516857	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00l2iepf856jnr4f	518164	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00l3iepfyt8h9bi7	522753	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00l4iepf1bxu3sge	524650	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00l5iepfqp2qgxad	527458	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00l6iepflgmpjsko	527794	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00l7iepf0sfb2ax8	530051	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00l8iepfyk29qyip	531673	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00l9iepfujsolwmt	531848	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00laiepf5pv8z34q	534472	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00lbiepfbkczvc88	535428	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00lciepfz95rq4pt	535439	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00ldiepff6v2v982	535440	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00leiepfg4znvm56	535454	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00lfiepf7f0affvb	535455	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00lgiepful9gzy39	535508	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00lhiepfhh9mgsdc	535509	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00liiepflk5f1h66	535510	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00ljiepf2ynqeg16	537663	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00lkiepff39uw2m3	542065	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00lliepfogha47t2	544277	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00lmiepfv46nsi6f	549849	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00lniepfkl2kcin6	549853	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00loiepfexb5t8tl	552011	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00lpiepf0kqgtr6p	557109	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00lqiepfknr428i0	557394	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00lriepf3dfwcavc	557395	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00lsiepf4vgwqc8m	557728	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00ltiepfjsybt2sq	516951	ТАСКОМБАНК	TASCOMBANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00luiepfcka4v4nt	516954	ТАСКОМБАНК	TASCOMBANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00lviepfixwyl3v5	526961	ТАСКОМБАНК	TASCOMBANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00lwiepf4r4blppn	530185	ТАСКОМБАНК	TASCOMBANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00lxiepfvp6tjkqw	535116	ТАСКОМБАНК	TASCOMBANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00lyiepf8bc0312t	535117	ТАСКОМБАНК	TASCOMBANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00lziepf1s265qov	537162	ТАСКОМБАНК	TASCOMBANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00m0iepfh2pc5t24	537456	ТАСКОМБАНК	TASCOMBANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00m1iepfv744bn2o	537457	ТАСКОМБАНК	TASCOMBANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00m2iepfitw4xp1t	537553	ТАСКОМБАНК	TASCOMBANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ud00m3iepf0qxiiw7r	551045	ТАСКОМБАНК	TASCOMBANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00m4iepfuris6bm5	557437	ТАСКОМБАНК	TASCOMBANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00m5iepf1jytdfhp	559649	ТАСКОМБАНК	TASCOMBANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00m6iepfo7rpd9hu	535606	БТА БАНК	BTA BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00m7iepf3acne0fu	535607	БТА БАНК	BTA BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00m8iepf332dh1oe	535608	БТА БАНК	BTA BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00m9iepfdqfvpsvw	545083	БТА БАНК	BTA BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00maiepf4no6q4wr	545527	БТА БАНК	BTA BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00mbiepfyrszf40h	552665	БТА БАНК	BTA BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00mciepfx1bw6g8d	521152	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00mdiepfy345jmrt	535145	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00meiepfb6n6efyy	544013	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00mfiepfvnde4td6	557721	ПриватБанк	Privatbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00mgiepfo4fxhvv3	535277	КОНКОРД	CONCORD	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00mhiepf74bp1pjt	535278	КОНКОРД	CONCORD	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00miiepfzip0csnd	545201	КОНКОРД	CONCORD	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00mjiepfbmxhriit	511695	УКРСИББАНК	Ukrsibbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00mkiepfmdkfjbfo	522871	УКРСИББАНК	Ukrsibbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00mliepfsg0nvbax	523648	УКРСИББАНК	Ukrsibbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00mmiepfbkehm4h2	557099	УКРСИББАНК	Ukrsibbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00mniepfh9v8vnfu	557100	УКРСИББАНК	Ukrsibbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00moiepfmbg51rlk	558259	УКРСИББАНК	Ukrsibbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00mpiepffwvyahgw	521813	ПРАВЕКС-БАНК	PRAVEX-BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00mqiepfa46l0r8g	522433	ПРАВЕКС-БАНК	PRAVEX-BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00mriepfo4g4j826	537437	ПРАВЕКС-БАНК	PRAVEX-BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00msiepfvsstbim3	541698	ПРАВЕКС-БАНК	PRAVEX-BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00mtiepf9h6v5b77	557722	ПРАВЕКС-БАНК	PRAVEX-BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00muiepfbr33crhn	535208	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00mviepf4ax7o8bo	516048	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00mwiepfrdjq4d92	516692	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00mxiepfzj3raqmb	516739	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00myiepff8sr111m	516755	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00mziepfz3199ycs	516756	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00n0iepfzt0eag9o	516758	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00n1iepfltbvl5vd	516761	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00n2iepfxei603cq	516769	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00n3iepfagax3ms2	516792	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00n4iepf9kmc1hw3	516824	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00n5iepfgbna2wre	516830	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00n6iepfsvy0xdis	516845	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00n7iepfj8ooc80r	516863	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00n8iepfe3f514st	516899	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00n9iepf7duge79s	517404	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00naiepfsxqgwlw4	517489	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00nbiepfiyaeunap	518623	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00nciepf787ydeuy	521513	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00ndiepf23v4q0yk	525626	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00neiepfvmgzw4yt	526846	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00nfiepf65k44pem	527039	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00ngiepfthcfhgoh	529244	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00nhiepfluv84pn7	532197	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00niiepfkjvy0uf7	535118	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00njiepf34eqsn32	535119	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00nkiepfbnpe9n5l	535124	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00nliepfwbji8luc	535125	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00nmiepfpaot9x4w	535207	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00nniepf45sgvn8w	535261	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00noiepfftfzfhqo	537482	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00npiepfunioxwqz	540931	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00nqiepfxz9asb2p	541733	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00nriepfea1aewqm	543973	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00nsiepfklb5q7l7	544362	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00ntiepfdbkdscz1	544847	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00nuiepf59hgq20a	547987	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00nviepfh7qgk97u	549820	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6ue00nwiepfaf6g8emx	552709	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00nxiepfk7jgm7f0	554956	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00nyiepfudkgdunc	557088	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00nziepfw4btvxky	557089	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00o0iepfjycn1l9a	557825	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00o1iepf59n6yml5	557826	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00o2iepf9aixbzzu	558376	ПУМБ	FUIB	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00o4iepf2h7jo6mh	522466	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00o5iepfu12zrrsg	525485	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00o6iepfvo0b87v1	535161	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00o7iepfzz1ubm8r	535162	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00o8iepf15ainrbe	535174	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00o9iepfrwhzuezm	536421	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00oaiepfl18blm7g	542662	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00obiepf6x2617gk	544509	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00ociepf58552oee	548735	УКРГАЗБАНК	Ukrgasbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00odiepf7v90wswf	518158	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00oeiepfkakljwon	527166	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00ofiepfvwxu4zon	527220	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00ogiepftclz7o1t	530539	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00ohiepfb4nbwetc	535148	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00oiiepfgh1niz66	535149	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00ojiepfnrjgkci0	535150	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00okiepfozysdxub	535515	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00oliepf89kxvccb	535516	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00omiepfe2eflmjj	535540	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00oniepfvg9k32ip	547733	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00ooiepfs58x2hnh	547846	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00opiepfoqkwsmjc	557090	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00oqiepf4l9dbfdv	557091	Райффайзен Банк Аваль	Raiffeisen Bank Aval	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00oriepf4hqg5ols	535130	УКРСИББАНК	Ukrsibbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00osiepfdhayim2k	516877	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00otiepf5zexyw42	516879	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00ouiepf6vwd36iq	516880	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00oviepfxdlqsexd	516886	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00owiepfq6dhf29u	525748	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00oxiepfo9um5uca	544502	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00oyiepf3deb0xfm	554955	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00oziepf4t27onpr	557077	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00p0iepfyvsj0z67	557078	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00p1iepfwazyv4kv	557096	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00p2iepfna7hrg3b	515883	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00p3iepfnce248hj	516881	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00p4iepfwney1bxs	535275	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00p5iepfaj19u2ig	535293	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00p6iepfapdmxebp	548388	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00p7iepfe2cgcexr	549210	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00p8iepfck9urrpq	557743	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00p9iepfra3b535h	557832	Укрэксимбанк	Ukreximbank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00paiepfw4mjhhef	535838	Монобанк	Monobank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00pbiepfygth613m	44411114	Монобанк	Monobank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00pciepf402bqevi	44411144	Монобанк	Monobank	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
cmdysv6uf00pdiepf7vkocqcq	432334	А-Банк	AKTSENT BANK	2025-08-05 17:15:14.898	2025-08-05 17:15:14.898	\N
\.


--
-- Data for Name: CardPaymentRequestsMethod; Type: TABLE DATA; Schema: public; Owner: nikita
--

COPY public."CardPaymentRequestsMethod" (id, card, comment, "createdAt", "updatedAt", "bankId", "requestId") FROM stdin;
cmdyy529d0005iexvs2tfce90	5168745632147896	Card request created via bot	2025-08-05 19:42:53.617	2025-08-05 19:42:53.617	cmdysv6u2001yiepfeaoh55hk	cmdyy529d0003iexvi6z5azf8
cme1lixt10005iezkcxxgzdm6	4441114402376089	Card request created via bot	2025-08-07 16:13:04.549	2025-08-07 16:13:04.549	cmdysv6u6007yiepf7ddh3bmk	cme1lixt00003iezkmjjah565
\.


--
-- Data for Name: Currency; Type: TABLE DATA; Schema: public; Owner: nikita
--

COPY public."Currency" (id, code, "nameEn", symbol, name) FROM stdin;
cmdysv6sc0003iepfh4st0yuh	UAH	UAH	₴	UAH
cmdysv6sc0004iepfv8mrjsu1	USD	USD	$	USD
\.


--
-- Data for Name: IbanPaymentRequestsMethod; Type: TABLE DATA; Schema: public; Owner: nikita
--

COPY public."IbanPaymentRequestsMethod" (id, iban, inn, comment, name, "createdAt", "updatedAt", "requestId") FROM stdin;
\.


--
-- Data for Name: Message; Type: TABLE DATA; Schema: public; Owner: nikita
--

COPY public."Message" (id, "chatId", "messageId", text, "photoUrl", "createdAt", "updatedAt", "requestId", "accessType") FROM stdin;
cmdyy52o50006iexvokt3ow9o	-1002510029234	2792	✉️<b>Заявка номер:</b> <code>cmdyy529d0003iexvi6z5azf8</code>\n🏦<b>Банк:</b> <i>ПриватБанк</i>\n💵<b>Сумма:</b> <code>33333</code>\n💱<b>Курс:</b> <code>43.5</code>\n💎<b>USDT:</b> <code>766.28</code>\n💳<b>Номер карты:</b> <code>****************</code>\n	./src/assets/0056.jpg	2025-08-05 19:42:54.149	2025-08-05 19:42:54.149	cmdyy529d0003iexvi6z5azf8	PUBLIC
cmdyy57k40008iexve56evjmt	-1002887877945	419	✉️<b>Заявка номер:</b> <code>cmdyy529d0003iexvi6z5azf8</code>\n🏦<b>Банк:</b> <i>ПриватБанк</i>\n💵<b>Сумма:</b> <code>33333</code>\n💱<b>Курс:</b> <code>43.5</code>\n💎<b>USDT:</b> <code>766.28</code>\n💳<b>Номер карты:</b> <code>****************</code>\n	./src/assets/0056.jpg	2025-08-05 19:43:00.485	2025-08-05 19:43:00.485	cmdyy529d0003iexvi6z5azf8	WORKER
cmdyy57ou0009iexv46njbifw	375905624	3702	✉️<b>Заявка номер:</b> <code>cmdyy529d0003iexvi6z5azf8</code>\n🏦<b>Банк:</b> <i>ПриватБанк</i>\n💵<b>Сумма:</b> <code>33333</code>\n💱<b>Курс:</b> <code>43.5</code>\n💎<b>USDT:</b> <code>766.28</code>\n💳<b>Номер карты:</b> <code>****************</code>\n<b>Партнер:</b> <i>TestT</i>\n	./src/assets/0056.jpg	2025-08-05 19:43:00.654	2025-08-05 19:43:00.654	cmdyy529d0003iexvi6z5azf8	ADMIN
cme1liy5m0006iezkxyqlgi83	-4868917152	3733	✉️<b>Заявка номер:</b> <code>cme1lixt00003iezkmjjah565</code>\n🏦<b>Банк:</b> <i>Монобанк</i>\n💵<b>Сумма:</b> <code>5000</code>\n💱<b>Курс:</b> <code>1</code>\n💎<b>USDT:</b> <code>5000.00</code>\n💳<b>Номер карты:</b> <code>****************</code>\n	./src/assets/0056.jpg	2025-08-07 16:13:05.002	2025-08-07 16:13:05.002	cme1lixt00003iezkmjjah565	PUBLIC
cme1lj2i70008iezkl04y5pxl	-1002887877945	425	✉️<b>Заявка номер:</b> <code>cme1lixt00003iezkmjjah565</code>\n🏦<b>Банк:</b> <i>Монобанк</i>\n💵<b>Сумма:</b> <code>5000</code>\n💱<b>Курс:</b> <code>1</code>\n💎<b>USDT:</b> <code>5000.00</code>\n💳<b>Номер карты:</b> <code>****************</code>\n	./src/assets/0056.jpg	2025-08-07 16:13:10.639	2025-08-07 16:13:10.639	cme1lixt00003iezkmjjah565	WORKER
cme1lj2vs0009iezksf5lwylr	375905624	3736	✉️<b>Заявка номер:</b> <code>cme1lixt00003iezkmjjah565</code>\n🏦<b>Банк:</b> <i>Монобанк</i>\n💵<b>Сумма:</b> <code>5000</code>\n💱<b>Курс:</b> <code>1</code>\n💎<b>USDT:</b> <code>5000.00</code>\n💳<b>Номер карты:</b> <code>****************</code>\n<b>Партнер:</b> <i>NewBot</i>\n	./src/assets/0056.jpg	2025-08-07 16:13:11.128	2025-08-07 16:13:11.128	cme1lixt00003iezkmjjah565	ADMIN
\.


--
-- Data for Name: PaymentMethod; Type: TABLE DATA; Schema: public; Owner: nikita
--

COPY public."PaymentMethod" (id, "nameEn", description, "descriptionEn", icon) FROM stdin;
cmdysv6sj0005iepftwm5zdop	CARD	Visa/MasterCard	Visa/MasterCard	\N
cmdysv6sj0006iepf5mcuo2v0	IBAN	Visa/MasterCard	Visa/MasterCard	\N
\.


--
-- Data for Name: PaymentRequests; Type: TABLE DATA; Schema: public; Owner: nikita
--

COPY public."PaymentRequests" (id, "vendorId", "userId", "payedByUserId", amount, status, error, "currencyId", "notificationSent", "createdAt", "updatedAt", "completedAt", "ratesId", "activeUserId", "paymentMethodId") FROM stdin;
cmdyy529d0003iexvi6z5azf8	cmdyy3xmx0000iexvbslztlz1	\N	cmdysx03o0000ieuayp04gkne	33333	FAILED	\N	cmdysv6sc0003iepfh4st0yuh	t	2025-08-05 19:42:53.617	2025-08-05 20:08:03.27	\N	\N	cmdysx03o0000ieuayp04gkne	cmdysv6sj0005iepftwm5zdop
cme1lixt00003iezkmjjah565	cme1jzzgn0000iezknypueb4z	\N	cme1lih5z0001iezk421xihz4	5000	COMPLETED	\N	cmdysv6sc0003iepfh4st0yuh	t	2025-08-07 16:13:04.549	2025-08-07 16:13:48.122	2025-08-07 16:13:48.121	\N	cme1lih5z0001iezk421xihz4	cmdysv6sj0005iepftwm5zdop
\.


--
-- Data for Name: Rates; Type: TABLE DATA; Schema: public; Owner: nikita
--

COPY public."Rates" (id, "currencyId", "minAmount", "maxAmount", rate, "updatedAt", "createdAt", "paymentMethodId") FROM stdin;
cme9wlzhq0003ied8xf1o89p1	cmdysv6sc0003iepfh4st0yuh	10000	0	45.3	2025-08-13 11:45:31.886	2025-08-13 11:45:31.886	cmdysv6sj0005iepftwm5zdop
cme9wlzhq0004ied8j18s7t5z	cmdysv6sc0003iepfh4st0yuh	1000	9999	42.3	2025-08-13 11:45:31.886	2025-08-13 11:45:31.886	cmdysv6sj0005iepftwm5zdop
cme9wlzhq0005ied8phv2g1q9	cmdysv6sc0003iepfh4st0yuh	10000	0	45.3	2025-08-13 11:45:31.886	2025-08-13 11:45:31.886	cmdysv6sj0006iepf5mcuo2v0
cme9wlzhq0006ied8ic016g2n	cmdysv6sc0003iepfh4st0yuh	1000	9999	42.3	2025-08-13 11:45:31.886	2025-08-13 11:45:31.886	cmdysv6sj0006iepf5mcuo2v0
\.


--
-- Data for Name: Role; Type: TABLE DATA; Schema: public; Owner: nikita
--

COPY public."Role" (id, name) FROM stdin;
cmdysv6s10000iepf0oy5kg82	ADMIN
cmdysv6s10001iepfbvlthg36	WORKER
cmdysv6s10002iepf6wcqrswv	GUEST
\.


--
-- Data for Name: Settings; Type: TABLE DATA; Schema: public; Owner: nikita
--

COPY public."Settings" (name, "onPause", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: nikita
--

COPY public."User" (id, username, "telegramId", "onPause", "createdAt", "updatedAt") FROM stdin;
cmdysx03o0000ieuayp04gkne	nnprf	375905624	t	2025-08-05 17:16:39.492	2025-08-05 17:16:39.492
cme1lih5z0001iezk421xihz4	aa_wrld22	6705096432	t	2025-08-07 16:12:42.983	2025-08-07 16:12:42.983
6742333052	@Acc1_A	6742333052	t	2025-08-07 16:12:42.983	2025-08-07 16:12:42.983
6455899560	@Acc2_N	6455899560	t	2025-08-07 16:12:42.983	2025-08-07 16:12:42.983
6908176412	@Vannyyaa5	6908176412	t	2025-08-07 16:12:42.983	2025-08-07 16:12:42.983
6609184776	@vlr41	6609184776	t	2025-08-07 16:12:42.983	2025-08-07 16:12:42.983
6219189757	@eao077	6219189757	t	2025-08-07 16:12:42.983	2025-08-07 16:12:42.983
cme9wicff0000ied8y8sa5h2o	nnomnibus	8045572818	t	2025-08-13 11:42:42.026	2025-08-13 11:42:42.026
\.


--
-- Data for Name: Vendors; Type: TABLE DATA; Schema: public; Owner: nikita
--

COPY public."Vendors" (id, "chatId", work, "showReceipt", title, token, "lastReportedAt", "lastAllRatesSentAt", "lastAllRateMessageId", "createdAt", "updatedAt") FROM stdin;
cme9tewim0000ie04p69eflux	-1002040158545	f	f	uachanger	3f67a06429686e3ef396649fe35dff29e8a6a1a9881db1bcf8d7b42763775b6a	2025-08-13 10:16:02.591	2025-08-13 10:16:02.591	\N	2025-08-13 10:16:02.591	2025-08-13 10:15:31.541
cme9tg1pj0001ie04yg7qzsry	-1001951910259	f	f	2rbina	\N	2025-08-13 10:16:55.974	2025-08-13 10:16:55.974	\N	2025-08-13 10:16:55.974	2025-08-13 10:16:05.851
cme9tg1pj0002ie04pgzvbuwe	-914214583	f	f	hotex	\N	2025-08-13 10:16:55.974	2025-08-13 10:16:55.974	\N	2025-08-13 10:16:55.974	2025-08-13 10:16:43.648
cme9tmofk0003ie0472ddp0f4	-1002026347943	f	f	1mill_ukr	\N	2025-08-13 10:22:05.36	2025-08-13 10:22:05.36	\N	2025-08-13 10:22:05.36	2025-08-13 10:16:57.745
cme9tmofl0004ie04lnimc6o4	-794355865	f	f	KRB250_main	\N	2025-08-13 10:22:05.36	2025-08-13 10:22:05.36	\N	2025-08-13 10:22:05.36	2025-08-13 10:18:03.097
cme9tmofm0005ie04fwv8kcxh	-4528893122	f	f	YZ08	\N	2025-08-13 10:22:05.36	2025-08-13 10:22:05.36	\N	2025-08-13 10:22:05.36	2025-08-13 10:18:37.028
cme9tmofm0006ie04ul9n50sa	-4556067389	f	f	123UKR	\N	2025-08-13 10:22:05.36	2025-08-13 10:22:05.36	\N	2025-08-13 10:22:05.36	2025-08-13 10:19:01.149
cme9tmofm0007ie04o7mw1soe	-4503064338	f	f	NAMOMENTE	\N	2025-08-13 10:22:05.36	2025-08-13 10:22:05.36	\N	2025-08-13 10:22:05.36	2025-08-13 10:19:40.986
cme9tmofn0008ie04btyysm79	-4576055508	f	f	YZ10	\N	2025-08-13 10:22:05.36	2025-08-13 10:22:05.36	\N	2025-08-13 10:22:05.36	2025-08-13 10:19:53.072
cme9tmofn0009ie04edrocfjl	-4506024195	f	f	YZYPAY	\N	2025-08-13 10:22:05.36	2025-08-13 10:22:05.36	\N	2025-08-13 10:22:05.36	2025-08-13 10:20:15.249
cme9tmofn000aie045a8x9tqc	-4074001080	f	f	WB	\N	2025-08-13 10:22:05.36	2025-08-13 10:22:05.36	\N	2025-08-13 10:22:05.36	2025-08-13 10:20:35.678
cme9tmofo000bie049l3h65b3	-4728012503	f	f	YZ_267	\N	2025-08-13 10:22:05.36	2025-08-13 10:22:05.36	\N	2025-08-13 10:22:05.36	2025-08-13 10:21:05.97
cme9tmofo000cie04582u3qgh	-4507275459	f	f	YZ_07	\N	2025-08-13 10:22:05.36	2025-08-13 10:22:05.36	\N	2025-08-13 10:22:05.36	2025-08-13 10:21:13.127
cme9tmofo000die04k1hgx8v1	-4876259256	f	f	API_UAH_alex_bn	5e8aa89d5f04bc17f89aeb221f5a85c237b202528528513f28179ab7	2025-08-13 10:22:05.36	2025-08-13 10:22:05.36	\N	2025-08-13 10:22:05.36	2025-08-13 10:21:32.435
cme9tmofp000eie049ey1505t	-1002625353108	f	f	kult_pako	\N	2025-08-13 10:22:05.36	2025-08-13 10:22:05.36	\N	2025-08-13 10:22:05.36	2025-08-13 10:22:40.905
cme9wixx70002ied8a71ozh4e	-4072718505	t	t	12345-ПК7	17f3d7ab-0589-4e01-a688-4dc710000ed9	2025-08-13 11:43:09.881	\N	\N	2025-08-13 11:43:09.883	2025-08-13 11:43:09.883
cme1jzzgn0000iezknypueb4z	-4868917152	t	t	NewBot	9ea8646a-10de-4adb-b0b6-800ecdac96e4	2025-08-07 15:30:20.614	\N	3860	2025-08-07 15:30:20.616	2025-08-07 15:30:20.616
cmdyy3xmx0000iexvbslztlz1	-1002510029234	t	t	TestT	d153542d-2390-460f-a6ae-b92730aaec5e	2025-08-05 19:42:00.968	\N	2807	2025-08-05 19:42:00.97	2025-08-05 19:42:00.97
\.


--
-- Data for Name: WorkerRequestPhotoMessage; Type: TABLE DATA; Schema: public; Owner: nikita
--

COPY public."WorkerRequestPhotoMessage" (id, "requestId", "userId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: _BlackListToCardPaymentRequestsMethod; Type: TABLE DATA; Schema: public; Owner: nikita
--

COPY public."_BlackListToCardPaymentRequestsMethod" ("A", "B") FROM stdin;
\.


--
-- Data for Name: _RoleToUser; Type: TABLE DATA; Schema: public; Owner: nikita
--

COPY public."_RoleToUser" ("A", "B") FROM stdin;
cmdysv6s10000iepf0oy5kg82	cmdysx03o0000ieuayp04gkne
cmdysv6s10000iepf0oy5kg82	cme1lih5z0001iezk421xihz4
cmdysv6s10001iepfbvlthg36	6219189757
cmdysv6s10001iepfbvlthg36	6455899560
cmdysv6s10001iepfbvlthg36	6609184776
cmdysv6s10001iepfbvlthg36	6742333052
cmdysv6s10001iepfbvlthg36	6908176412
cmdysv6s10001iepfbvlthg36	cme1lih5z0001iezk421xihz4
cmdysv6s10001iepfbvlthg36	cmdysx03o0000ieuayp04gkne
cmdysv6s10001iepfbvlthg36	cme9wicff0000ied8y8sa5h2o
cmdysv6s10000iepf0oy5kg82	cme9wicff0000ied8y8sa5h2o
\.


--
-- Data for Name: _UserToVendors; Type: TABLE DATA; Schema: public; Owner: nikita
--

COPY public."_UserToVendors" ("A", "B") FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: nikita
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
3f22f2bd-956d-4e1b-8907-88f5652df891	fb550ec1554cbe5bd21879f973f5a7c5f36779e2b4fe757ea829951604e2db17	2025-08-05 20:12:46.690134+03	20250630092307_init	\N	\N	2025-08-05 20:12:46.553375+03	1
08390e04-d3ad-4cd3-843d-cb667cb2b4c6	c627c7b0788ac9b3d41537311f94a8128465ef50159dee0d7dceeca3f31d872d	2025-08-05 20:12:46.731673+03	20250804225836_dev	\N	\N	2025-08-05 20:12:46.691754+03	1
\.


--
-- Name: AdminRequestPhotoMessage AdminRequestPhotoMessage_pkey; Type: CONSTRAINT; Schema: public; Owner: nikita
--

ALTER TABLE ONLY public."AdminRequestPhotoMessage"
    ADD CONSTRAINT "AdminRequestPhotoMessage_pkey" PRIMARY KEY (id);


--
-- Name: BlackList BlackList_pkey; Type: CONSTRAINT; Schema: public; Owner: nikita
--

ALTER TABLE ONLY public."BlackList"
    ADD CONSTRAINT "BlackList_pkey" PRIMARY KEY (id);


--
-- Name: CardBank CardBank_pkey; Type: CONSTRAINT; Schema: public; Owner: nikita
--

ALTER TABLE ONLY public."CardBank"
    ADD CONSTRAINT "CardBank_pkey" PRIMARY KEY (id);


--
-- Name: CardPaymentRequestsMethod CardPaymentRequestsMethod_pkey; Type: CONSTRAINT; Schema: public; Owner: nikita
--

ALTER TABLE ONLY public."CardPaymentRequestsMethod"
    ADD CONSTRAINT "CardPaymentRequestsMethod_pkey" PRIMARY KEY (id);


--
-- Name: Currency Currency_pkey; Type: CONSTRAINT; Schema: public; Owner: nikita
--

ALTER TABLE ONLY public."Currency"
    ADD CONSTRAINT "Currency_pkey" PRIMARY KEY (id);


--
-- Name: IbanPaymentRequestsMethod IbanPaymentRequestsMethod_pkey; Type: CONSTRAINT; Schema: public; Owner: nikita
--

ALTER TABLE ONLY public."IbanPaymentRequestsMethod"
    ADD CONSTRAINT "IbanPaymentRequestsMethod_pkey" PRIMARY KEY (id);


--
-- Name: Message Message_pkey; Type: CONSTRAINT; Schema: public; Owner: nikita
--

ALTER TABLE ONLY public."Message"
    ADD CONSTRAINT "Message_pkey" PRIMARY KEY (id);


--
-- Name: PaymentMethod PaymentMethod_pkey; Type: CONSTRAINT; Schema: public; Owner: nikita
--

ALTER TABLE ONLY public."PaymentMethod"
    ADD CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY (id);


--
-- Name: PaymentRequests PaymentRequests_pkey; Type: CONSTRAINT; Schema: public; Owner: nikita
--

ALTER TABLE ONLY public."PaymentRequests"
    ADD CONSTRAINT "PaymentRequests_pkey" PRIMARY KEY (id);


--
-- Name: Rates Rates_pkey; Type: CONSTRAINT; Schema: public; Owner: nikita
--

ALTER TABLE ONLY public."Rates"
    ADD CONSTRAINT "Rates_pkey" PRIMARY KEY (id);


--
-- Name: Role Role_pkey; Type: CONSTRAINT; Schema: public; Owner: nikita
--

ALTER TABLE ONLY public."Role"
    ADD CONSTRAINT "Role_pkey" PRIMARY KEY (id);


--
-- Name: Settings Settings_pkey; Type: CONSTRAINT; Schema: public; Owner: nikita
--

ALTER TABLE ONLY public."Settings"
    ADD CONSTRAINT "Settings_pkey" PRIMARY KEY (name);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: nikita
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: Vendors Vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: nikita
--

ALTER TABLE ONLY public."Vendors"
    ADD CONSTRAINT "Vendors_pkey" PRIMARY KEY (id);


--
-- Name: WorkerRequestPhotoMessage WorkerRequestPhotoMessage_pkey; Type: CONSTRAINT; Schema: public; Owner: nikita
--

ALTER TABLE ONLY public."WorkerRequestPhotoMessage"
    ADD CONSTRAINT "WorkerRequestPhotoMessage_pkey" PRIMARY KEY (id);


--
-- Name: _BlackListToCardPaymentRequestsMethod _BlackListToCardPaymentRequestsMethod_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: nikita
--

ALTER TABLE ONLY public."_BlackListToCardPaymentRequestsMethod"
    ADD CONSTRAINT "_BlackListToCardPaymentRequestsMethod_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: _RoleToUser _RoleToUser_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: nikita
--

ALTER TABLE ONLY public."_RoleToUser"
    ADD CONSTRAINT "_RoleToUser_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: _UserToVendors _UserToVendors_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: nikita
--

ALTER TABLE ONLY public."_UserToVendors"
    ADD CONSTRAINT "_UserToVendors_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: nikita
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: BlackList_requestId_key; Type: INDEX; Schema: public; Owner: nikita
--

CREATE UNIQUE INDEX "BlackList_requestId_key" ON public."BlackList" USING btree ("requestId");


--
-- Name: CardBank_number_key; Type: INDEX; Schema: public; Owner: nikita
--

CREATE UNIQUE INDEX "CardBank_number_key" ON public."CardBank" USING btree (number);


--
-- Name: Currency_code_key; Type: INDEX; Schema: public; Owner: nikita
--

CREATE UNIQUE INDEX "Currency_code_key" ON public."Currency" USING btree (code);


--
-- Name: Currency_name_key; Type: INDEX; Schema: public; Owner: nikita
--

CREATE UNIQUE INDEX "Currency_name_key" ON public."Currency" USING btree (name);


--
-- Name: Message_messageId_key; Type: INDEX; Schema: public; Owner: nikita
--

CREATE UNIQUE INDEX "Message_messageId_key" ON public."Message" USING btree ("messageId");


--
-- Name: PaymentMethod_nameEn_key; Type: INDEX; Schema: public; Owner: nikita
--

CREATE UNIQUE INDEX "PaymentMethod_nameEn_key" ON public."PaymentMethod" USING btree ("nameEn");


--
-- Name: Role_name_key; Type: INDEX; Schema: public; Owner: nikita
--

CREATE UNIQUE INDEX "Role_name_key" ON public."Role" USING btree (name);


--
-- Name: User_telegramId_key; Type: INDEX; Schema: public; Owner: nikita
--

CREATE UNIQUE INDEX "User_telegramId_key" ON public."User" USING btree ("telegramId");


--
-- Name: User_username_key; Type: INDEX; Schema: public; Owner: nikita
--

CREATE UNIQUE INDEX "User_username_key" ON public."User" USING btree (username);


--
-- Name: Vendors_chatId_key; Type: INDEX; Schema: public; Owner: nikita
--

CREATE UNIQUE INDEX "Vendors_chatId_key" ON public."Vendors" USING btree ("chatId");


--
-- Name: Vendors_lastAllRateMessageId_key; Type: INDEX; Schema: public; Owner: nikita
--

CREATE UNIQUE INDEX "Vendors_lastAllRateMessageId_key" ON public."Vendors" USING btree ("lastAllRateMessageId");


--
-- Name: Vendors_title_key; Type: INDEX; Schema: public; Owner: nikita
--

CREATE UNIQUE INDEX "Vendors_title_key" ON public."Vendors" USING btree (title);


--
-- Name: Vendors_token_key; Type: INDEX; Schema: public; Owner: nikita
--

CREATE UNIQUE INDEX "Vendors_token_key" ON public."Vendors" USING btree (token);


--
-- Name: _BlackListToCardPaymentRequestsMethod_B_index; Type: INDEX; Schema: public; Owner: nikita
--

CREATE INDEX "_BlackListToCardPaymentRequestsMethod_B_index" ON public."_BlackListToCardPaymentRequestsMethod" USING btree ("B");


--
-- Name: _RoleToUser_B_index; Type: INDEX; Schema: public; Owner: nikita
--

CREATE INDEX "_RoleToUser_B_index" ON public."_RoleToUser" USING btree ("B");


--
-- Name: _UserToVendors_B_index; Type: INDEX; Schema: public; Owner: nikita
--

CREATE INDEX "_UserToVendors_B_index" ON public."_UserToVendors" USING btree ("B");


--
-- Name: AdminRequestPhotoMessage AdminRequestPhotoMessage_requestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nikita
--

ALTER TABLE ONLY public."AdminRequestPhotoMessage"
    ADD CONSTRAINT "AdminRequestPhotoMessage_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES public."PaymentRequests"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AdminRequestPhotoMessage AdminRequestPhotoMessage_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nikita
--

ALTER TABLE ONLY public."AdminRequestPhotoMessage"
    ADD CONSTRAINT "AdminRequestPhotoMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CardPaymentRequestsMethod CardPaymentRequestsMethod_bankId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nikita
--

ALTER TABLE ONLY public."CardPaymentRequestsMethod"
    ADD CONSTRAINT "CardPaymentRequestsMethod_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES public."CardBank"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CardPaymentRequestsMethod CardPaymentRequestsMethod_requestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nikita
--

ALTER TABLE ONLY public."CardPaymentRequestsMethod"
    ADD CONSTRAINT "CardPaymentRequestsMethod_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES public."PaymentRequests"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: IbanPaymentRequestsMethod IbanPaymentRequestsMethod_requestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nikita
--

ALTER TABLE ONLY public."IbanPaymentRequestsMethod"
    ADD CONSTRAINT "IbanPaymentRequestsMethod_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES public."PaymentRequests"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Message Message_requestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nikita
--

ALTER TABLE ONLY public."Message"
    ADD CONSTRAINT "Message_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES public."PaymentRequests"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PaymentRequests PaymentRequests_activeUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nikita
--

ALTER TABLE ONLY public."PaymentRequests"
    ADD CONSTRAINT "PaymentRequests_activeUserId_fkey" FOREIGN KEY ("activeUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PaymentRequests PaymentRequests_currencyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nikita
--

ALTER TABLE ONLY public."PaymentRequests"
    ADD CONSTRAINT "PaymentRequests_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES public."Currency"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PaymentRequests PaymentRequests_payedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nikita
--

ALTER TABLE ONLY public."PaymentRequests"
    ADD CONSTRAINT "PaymentRequests_payedByUserId_fkey" FOREIGN KEY ("payedByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PaymentRequests PaymentRequests_paymentMethodId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nikita
--

ALTER TABLE ONLY public."PaymentRequests"
    ADD CONSTRAINT "PaymentRequests_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES public."PaymentMethod"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PaymentRequests PaymentRequests_ratesId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nikita
--

ALTER TABLE ONLY public."PaymentRequests"
    ADD CONSTRAINT "PaymentRequests_ratesId_fkey" FOREIGN KEY ("ratesId") REFERENCES public."Rates"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PaymentRequests PaymentRequests_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nikita
--

ALTER TABLE ONLY public."PaymentRequests"
    ADD CONSTRAINT "PaymentRequests_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PaymentRequests PaymentRequests_vendorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nikita
--

ALTER TABLE ONLY public."PaymentRequests"
    ADD CONSTRAINT "PaymentRequests_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES public."Vendors"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Rates Rates_currencyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nikita
--

ALTER TABLE ONLY public."Rates"
    ADD CONSTRAINT "Rates_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES public."Currency"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Rates Rates_paymentMethodId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nikita
--

ALTER TABLE ONLY public."Rates"
    ADD CONSTRAINT "Rates_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES public."PaymentMethod"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: WorkerRequestPhotoMessage WorkerRequestPhotoMessage_requestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nikita
--

ALTER TABLE ONLY public."WorkerRequestPhotoMessage"
    ADD CONSTRAINT "WorkerRequestPhotoMessage_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES public."PaymentRequests"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: WorkerRequestPhotoMessage WorkerRequestPhotoMessage_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nikita
--

ALTER TABLE ONLY public."WorkerRequestPhotoMessage"
    ADD CONSTRAINT "WorkerRequestPhotoMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: _BlackListToCardPaymentRequestsMethod _BlackListToCardPaymentRequestsMethod_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nikita
--

ALTER TABLE ONLY public."_BlackListToCardPaymentRequestsMethod"
    ADD CONSTRAINT "_BlackListToCardPaymentRequestsMethod_A_fkey" FOREIGN KEY ("A") REFERENCES public."BlackList"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _BlackListToCardPaymentRequestsMethod _BlackListToCardPaymentRequestsMethod_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nikita
--

ALTER TABLE ONLY public."_BlackListToCardPaymentRequestsMethod"
    ADD CONSTRAINT "_BlackListToCardPaymentRequestsMethod_B_fkey" FOREIGN KEY ("B") REFERENCES public."CardPaymentRequestsMethod"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _RoleToUser _RoleToUser_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nikita
--

ALTER TABLE ONLY public."_RoleToUser"
    ADD CONSTRAINT "_RoleToUser_A_fkey" FOREIGN KEY ("A") REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _RoleToUser _RoleToUser_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nikita
--

ALTER TABLE ONLY public."_RoleToUser"
    ADD CONSTRAINT "_RoleToUser_B_fkey" FOREIGN KEY ("B") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _UserToVendors _UserToVendors_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nikita
--

ALTER TABLE ONLY public."_UserToVendors"
    ADD CONSTRAINT "_UserToVendors_A_fkey" FOREIGN KEY ("A") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _UserToVendors _UserToVendors_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: nikita
--

ALTER TABLE ONLY public."_UserToVendors"
    ADD CONSTRAINT "_UserToVendors_B_fkey" FOREIGN KEY ("B") REFERENCES public."Vendors"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

