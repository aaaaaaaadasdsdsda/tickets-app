--
-- PostgreSQL database dump
--

\restrict iCwDHw3SWFOdEbcJHXOibRBGSWefcr53kbhR0ShxDir7fT1uNJA33eRy6wRXMeY

-- Dumped from database version 18.6 (4e955f5)
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: neon_auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA neon_auth;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE neon_auth.account (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "accountId" text NOT NULL,
    "providerId" text NOT NULL,
    "userId" uuid NOT NULL,
    "accessToken" text,
    "refreshToken" text,
    "idToken" text,
    "accessTokenExpiresAt" timestamp with time zone,
    "refreshTokenExpiresAt" timestamp with time zone,
    scope text,
    password text,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: invitation; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE neon_auth.invitation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "organizationId" uuid NOT NULL,
    email text NOT NULL,
    role text,
    status text NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "inviterId" uuid NOT NULL
);


--
-- Name: jwks; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE neon_auth.jwks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "publicKey" text NOT NULL,
    "privateKey" text NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "expiresAt" timestamp with time zone
);


--
-- Name: member; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE neon_auth.member (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "organizationId" uuid NOT NULL,
    "userId" uuid NOT NULL,
    role text NOT NULL,
    "createdAt" timestamp with time zone NOT NULL
);


--
-- Name: organization; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE neon_auth.organization (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    logo text,
    "createdAt" timestamp with time zone NOT NULL,
    metadata text
);


--
-- Name: project_config; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE neon_auth.project_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    endpoint_id text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    trusted_origins jsonb NOT NULL,
    social_providers jsonb NOT NULL,
    email_provider jsonb,
    email_and_password jsonb,
    allow_localhost boolean NOT NULL,
    plugin_configs jsonb,
    webhook_config jsonb
);


--
-- Name: session; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE neon_auth.session (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    token text NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    "userId" uuid NOT NULL,
    "impersonatedBy" text,
    "activeOrganizationId" text
);


--
-- Name: user; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE neon_auth."user" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    "emailVerified" boolean NOT NULL,
    image text,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    role text,
    banned boolean,
    "banReason" text,
    "banExpires" timestamp with time zone
);


--
-- Name: verification; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE neon_auth.verification (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    identifier text NOT NULL,
    value text NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: budgets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.budgets (
    id integer NOT NULL,
    categoria character varying NOT NULL,
    monto_mensual double precision NOT NULL,
    activo integer,
    creado timestamp without time zone
);


--
-- Name: budgets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.budgets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: budgets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.budgets_id_seq OWNED BY public.budgets.id;


--
-- Name: changelog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.changelog (
    id integer NOT NULL,
    record_id integer,
    user_id integer,
    user_nombre character varying,
    accion character varying NOT NULL,
    detalle_antes character varying,
    detalle_despues character varying,
    creado timestamp without time zone
);


--
-- Name: changelog_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.changelog_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: changelog_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.changelog_id_seq OWNED BY public.changelog.id;


--
-- Name: records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.records (
    id integer NOT NULL,
    fecha character varying NOT NULL,
    local character varying NOT NULL,
    tipo character varying NOT NULL,
    detalle character varying NOT NULL,
    total double precision NOT NULL,
    iva double precision,
    condicion character varying,
    rut_emisor character varying,
    rut_comprador character varying,
    notas text,
    creado timestamp without time zone,
    creado_por integer,
    attachment character varying,
    attachment_name character varying,
    moneda character varying DEFAULT 'UYU'::character varying
);


--
-- Name: records_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.records_id_seq OWNED BY public.records.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying NOT NULL,
    password_hash character varying NOT NULL,
    nombre character varying NOT NULL,
    role character varying NOT NULL
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: budgets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budgets ALTER COLUMN id SET DEFAULT nextval('public.budgets_id_seq'::regclass);


--
-- Name: changelog id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.changelog ALTER COLUMN id SET DEFAULT nextval('public.changelog_id_seq'::regclass);


--
-- Name: records id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.records ALTER COLUMN id SET DEFAULT nextval('public.records_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: account; Type: TABLE DATA; Schema: neon_auth; Owner: -
--

COPY neon_auth.account (id, "accountId", "providerId", "userId", "accessToken", "refreshToken", "idToken", "accessTokenExpiresAt", "refreshTokenExpiresAt", scope, password, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: invitation; Type: TABLE DATA; Schema: neon_auth; Owner: -
--

COPY neon_auth.invitation (id, "organizationId", email, role, status, "expiresAt", "createdAt", "inviterId") FROM stdin;
\.


--
-- Data for Name: jwks; Type: TABLE DATA; Schema: neon_auth; Owner: -
--

COPY neon_auth.jwks (id, "publicKey", "privateKey", "createdAt", "expiresAt") FROM stdin;
\.


--
-- Data for Name: member; Type: TABLE DATA; Schema: neon_auth; Owner: -
--

COPY neon_auth.member (id, "organizationId", "userId", role, "createdAt") FROM stdin;
\.


--
-- Data for Name: organization; Type: TABLE DATA; Schema: neon_auth; Owner: -
--

COPY neon_auth.organization (id, name, slug, logo, "createdAt", metadata) FROM stdin;
\.


--
-- Data for Name: project_config; Type: TABLE DATA; Schema: neon_auth; Owner: -
--

COPY neon_auth.project_config (id, name, endpoint_id, created_at, updated_at, trusted_origins, social_providers, email_provider, email_and_password, allow_localhost, plugin_configs, webhook_config) FROM stdin;
719cc5ce-3935-4ba5-ac70-dedfb049c337	tickes	ep-shiny-tree-b6n2d8fo	2026-10-01 03:32:59.368+00	2026-10-01 03:32:59.368+00	[]	[{"id": "google", "isShared": true}]	{"type": "shared"}	{"enabled": true, "disableSignUp": false, "emailVerificationMethod": "otp", "requireEmailVerification": false, "autoSignInAfterVerification": true, "sendVerificationEmailOnSignIn": false, "sendVerificationEmailOnSignUp": false}	t	{"magicLink": {"config": {"expiresIn": 5, "disableSignUp": false}, "enabled": false}, "phoneNumber": {"config": {"otp_expires_in": 300}, "enabled": false}, "organization": {"config": {"creatorRole": "owner", "membershipLimit": 100, "organizationLimit": 10, "sendInvitationEmail": false}, "enabled": true}}	{"enabled": false, "enabledEvents": [], "timeoutSeconds": 5}
\.


--
-- Data for Name: session; Type: TABLE DATA; Schema: neon_auth; Owner: -
--

COPY neon_auth.session (id, "expiresAt", token, "createdAt", "updatedAt", "ipAddress", "userAgent", "userId", "impersonatedBy", "activeOrganizationId") FROM stdin;
\.


--
-- Data for Name: user; Type: TABLE DATA; Schema: neon_auth; Owner: -
--

COPY neon_auth."user" (id, name, email, "emailVerified", image, "createdAt", "updatedAt", role, banned, "banReason", "banExpires") FROM stdin;
\.


--
-- Data for Name: verification; Type: TABLE DATA; Schema: neon_auth; Owner: -
--

COPY neon_auth.verification (id, identifier, value, "expiresAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: budgets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.budgets (id, categoria, monto_mensual, activo, creado) FROM stdin;
\.


--
-- Data for Name: changelog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.changelog (id, record_id, user_id, user_nombre, accion, detalle_antes, detalle_despues, creado) FROM stdin;
1	1	4	Flor	creado	\N	{"fecha": "2025-09-18", "local": "NACIROL", "tipo": "Salarios", "detalle": "Nacirol", "total": 193.0, "iva": 34.8, "condicion": "contado", "rut_emisor": "216588710015", "rut_comprador": "151025410017", "notas": null}	2026-10-01 05:05:02.078377
2	2	2	Administrador	creado	\N	{"fecha": "2025-09-18", "local": "FERRARIO", "tipo": "Compras/reparaciones", "detalle": "Jabon liquido", "total": 668.0, "iva": 120.46, "condicion": "credito", "rut_emisor": "213585030019", "rut_comprador": "151025410017", "notas": "pinto"}	2026-10-01 19:34:53.991862
3	3	4	Flor	creado	\N	{"fecha": "2025-09-15", "local": "ITAU", "tipo": "Compras/reparaciones", "detalle": "dildo", "total": 412.5, "iva": 0.0, "condicion": "contado", "rut_emisor": "215393460011", "rut_comprador": null, "notas": null}	2026-10-01 19:42:57.944107
4	4	4	Flor	creado	\N	{"fecha": "2025-09-15", "local": "ITAU", "tipo": "Compras/reparaciones", "detalle": "dildo", "total": 412.5, "iva": 0.0, "condicion": "contado", "rut_emisor": "215393460011", "rut_comprador": null, "notas": null}	2026-10-01 19:42:58.654647
5	4	2	Administrador	editado	{"fecha": "2025-09-15", "local": "ITAU", "tipo": "Compras/reparaciones", "detalle": "dildo", "total": 412.5, "iva": 0.0, "condicion": "contado", "rut_emisor": "215393460011", "rut_comprador": null, "notas": null}	{"fecha": "2025-09-15", "local": "ITAU", "tipo": "Compras/reparaciones", "detalle": "dildo", "total": 412.5, "iva": 0.0, "condicion": "contado", "rut_emisor": "215393460011", "rut_comprador": null, "notas": null}	2026-10-01 23:30:53.991933
6	3	2	Administrador	eliminado	{"fecha": "2025-09-15", "local": "ITAU", "tipo": "Compras/reparaciones", "detalle": "dildo", "total": 412.5, "iva": 0.0, "condicion": "contado", "rut_emisor": "215393460011", "rut_comprador": null, "notas": null}	\N	2026-10-01 23:35:32.91814
7	2	2	Administrador	eliminado	{"fecha": "2025-09-18", "local": "FERRARIO", "tipo": "Compras/reparaciones", "detalle": "Jabon liquido", "total": 668.0, "iva": 120.46, "condicion": "credito", "rut_emisor": "213585030019", "rut_comprador": "151025410017", "notas": "pinto"}	\N	2026-10-01 23:35:37.392473
8	1	2	Administrador	eliminado	{"fecha": "2025-09-18", "local": "NACIROL", "tipo": "Salarios", "detalle": "Nacirol", "total": 193.0, "iva": 34.8, "condicion": "contado", "rut_emisor": "216588710015", "rut_comprador": "151025410017", "notas": null}	\N	2026-10-01 23:35:40.492611
9	5	2	Administrador	creado	\N	{"fecha": "2025-05-31", "local": "ANTEL", "tipo": "Salarios", "detalle": "telefono", "total": 610.0, "iva": 110.0, "condicion": "credito", "rut_emisor": "211003420017", "rut_comprador": "151025410017", "notas": null}	2026-10-01 23:36:00.514456
10	6	2	Administrador	creado	\N	{"fecha": "2025-08-20", "local": "BSE", "tipo": "Servicios", "detalle": "pago seguro", "total": 8829.0, "iva": 1592.11, "condicion": "credito", "rut_emisor": "210465050018", "rut_comprador": "151025410017", "notas": null}	2026-10-01 23:37:23.180221
11	7	2	Administrador	creado	\N	{"fecha": "2025-09-18", "local": "FERRARIO", "tipo": "Servicios", "detalle": "Jabon liquido", "total": 668.0, "iva": 120.46, "condicion": "credito", "rut_emisor": "213585030019", "rut_comprador": "151025410017", "notas": null}	2026-10-01 23:38:19.521058
12	8	2	Administrador	creado	\N	{"fecha": "2025-09-18", "local": "NACIROL", "tipo": "Servicios", "detalle": "pago de jabon", "total": 193.0, "iva": 34.8, "condicion": "contado", "rut_emisor": "216588710015", "rut_comprador": "151025410017", "notas": null}	2026-10-01 23:39:18.156199
13	9	2	Administrador	creado	\N	{"fecha": "2025-09-29", "local": "WAIS", "tipo": "Servicios", "detalle": "efactura", "total": 603.0, "iva": 0.0, "condicion": "contado", "rut_emisor": "213856270010", "rut_comprador": "151025410017", "notas": null}	2026-10-01 23:39:34.188811
14	10	2	Administrador	creado	\N	{"fecha": "2025-09-30", "local": "WAIS", "tipo": "Servicios", "detalle": "resguardo", "total": 0.01, "iva": null, "condicion": "contado", "rut_emisor": "213856270010", "rut_comprador": null, "notas": null}	2026-10-01 23:41:48.859808
15	10	2	Administrador	editado	{"fecha": "2025-09-30", "local": "WAIS", "tipo": "Servicios", "detalle": "resguardo", "total": 0.01, "iva": null, "condicion": "contado", "rut_emisor": "213856270010", "rut_comprador": null, "notas": null}	{"fecha": "2025-09-30", "local": "WAIS", "tipo": "Servicios", "detalle": "resguardo", "total": 0.01, "iva": null, "condicion": "contado", "rut_emisor": "213856270010", "rut_comprador": "151025410017", "notas": null}	2026-10-01 23:42:54.630308
16	11	2	Administrador	creado	\N	{"fecha": "2024-06-17", "local": "HLS", "tipo": "Compras/reparaciones", "detalle": "RELOJ", "total": 313.0, "iva": null, "condicion": "credito", "rut_emisor": "211561830019", "rut_comprador": "151025410017", "notas": null}	2026-10-01 23:58:22.663733
17	11	2	Administrador	editado	{"fecha": "2024-06-17", "local": "HLS", "tipo": "Compras/reparaciones", "detalle": "RELOJ", "total": 313.0, "iva": null, "moneda": "UYU", "condicion": "credito", "rut_emisor": "211561830019", "rut_comprador": "151025410017", "notas": null}	{"fecha": "2024-06-17", "local": "HLS", "tipo": "Compras/reparaciones", "detalle": "RELOJ", "total": 313.0, "iva": null, "moneda": "USD", "condicion": "credito", "rut_emisor": "211561830019", "rut_comprador": "151025410017", "notas": null}	2026-10-02 00:51:43.341674
\.


--
-- Data for Name: records; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.records (id, fecha, local, tipo, detalle, total, iva, condicion, rut_emisor, rut_comprador, notas, creado, creado_por, attachment, attachment_name, moneda) FROM stdin;
4	2025-09-15	ITAU	Compras/reparaciones	dildo	412.5	0	contado	215393460011	\N	\N	2026-10-01 19:42:57.903768	4	rec_4_1790897450.pdf	BC ITAU 15-09-2025.pdf	UYU
5	2025-05-31	ANTEL	Salarios	telefono	610	110	credito	211003420017	151025410017	\N	2026-10-01 23:35:59.74492	2	rec_5_1790897761.pdf	FC ANTEL 31-05-2025 (2).pdf	UYU
6	2025-08-20	BSE	Servicios	pago seguro	8829	1592.11	credito	210465050018	151025410017	\N	2026-10-01 23:37:22.418451	2	rec_6_1790897844.pdf	FC BSE 20-08-2025.pdf	UYU
7	2025-09-18	FERRARIO	Servicios	Jabon liquido	668	120.46	credito	213585030019	151025410017	\N	2026-10-01 23:38:18.759955	2	rec_7_1790897900.pdf	FC FERRARIO 18-09-2025.pdf	UYU
8	2025-09-18	NACIROL	Servicios	pago de jabon	193	34.8	contado	216588710015	151025410017	\N	2026-10-01 23:39:17.395155	2	rec_8_1790897959.pdf	NC NACIROL 18-09-2025.pdf	UYU
9	2025-09-29	WAIS	Servicios	efactura	603	0	contado	213856270010	151025410017	\N	2026-10-01 23:39:33.428433	2	rec_9_1790897975.pdf	Recibo WAIS 29-09-2025.pdf	UYU
10	2025-09-30	WAIS	Servicios	resguardo	0.01	\N	contado	213856270010	151025410017	\N	2026-10-01 23:41:48.098487	2	rec_10_1790898110.pdf	Resguardo WAIS 30-09-2025.pdf	UYU
11	2024-06-17	HLS	Compras/reparaciones	RELOJ	313	\N	credito	211561830019	151025410017	\N	2026-10-01 23:58:21.905633	2	rec_11_1790899104.pdf	Adobe Scan 1 oct. 2026.pdf	USD
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, username, password_hash, nombre, role) FROM stdin;
1	axel	$2b$12$PVHiV1bcHfhRu88SrxWZVuz/IKI4ivCpB/6s50OLL5Tbr.GT4dAWi	Axel	programador
3	trabajador	$2b$12$.8Q64GJaQMCqzJZpUp//xOgYlF0MXG/ugBtrU0cCW5fba/ezVSqP2	Trabajador	trabajador
2	admin	$2b$12$U.16MWErKTxzDo8OhEoZxOnCU.8bG66KbLYfZ7vfsyGJDJqHlJy3a	Administrador	administrador
4	flor	$2b$12$4FMKKTjwh24miZBSGzOQd.fHIaWpVfyjOERKfol1CrUTIPt7uEu3e	Flor	trabajador
\.


--
-- Name: budgets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.budgets_id_seq', 1, false);


--
-- Name: changelog_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.changelog_id_seq', 17, true);


--
-- Name: records_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.records_id_seq', 11, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 4, true);


--
-- Name: account account_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.account
    ADD CONSTRAINT account_pkey PRIMARY KEY (id);


--
-- Name: invitation invitation_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.invitation
    ADD CONSTRAINT invitation_pkey PRIMARY KEY (id);


--
-- Name: jwks jwks_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.jwks
    ADD CONSTRAINT jwks_pkey PRIMARY KEY (id);


--
-- Name: member member_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.member
    ADD CONSTRAINT member_pkey PRIMARY KEY (id);


--
-- Name: organization organization_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.organization
    ADD CONSTRAINT organization_pkey PRIMARY KEY (id);


--
-- Name: organization organization_slug_key; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.organization
    ADD CONSTRAINT organization_slug_key UNIQUE (slug);


--
-- Name: project_config project_config_endpoint_id_key; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.project_config
    ADD CONSTRAINT project_config_endpoint_id_key UNIQUE (endpoint_id);


--
-- Name: project_config project_config_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.project_config
    ADD CONSTRAINT project_config_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (id);


--
-- Name: session session_token_key; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.session
    ADD CONSTRAINT session_token_key UNIQUE (token);


--
-- Name: user user_email_key; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth."user"
    ADD CONSTRAINT user_email_key UNIQUE (email);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: verification verification_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.verification
    ADD CONSTRAINT verification_pkey PRIMARY KEY (id);


--
-- Name: budgets budgets_categoria_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_categoria_key UNIQUE (categoria);


--
-- Name: budgets budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_pkey PRIMARY KEY (id);


--
-- Name: changelog changelog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.changelog
    ADD CONSTRAINT changelog_pkey PRIMARY KEY (id);


--
-- Name: records records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.records
    ADD CONSTRAINT records_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: account_userId_idx; Type: INDEX; Schema: neon_auth; Owner: -
--

CREATE INDEX "account_userId_idx" ON neon_auth.account USING btree ("userId");


--
-- Name: invitation_email_idx; Type: INDEX; Schema: neon_auth; Owner: -
--

CREATE INDEX invitation_email_idx ON neon_auth.invitation USING btree (email);


--
-- Name: invitation_organizationId_idx; Type: INDEX; Schema: neon_auth; Owner: -
--

CREATE INDEX "invitation_organizationId_idx" ON neon_auth.invitation USING btree ("organizationId");


--
-- Name: member_organizationId_idx; Type: INDEX; Schema: neon_auth; Owner: -
--

CREATE INDEX "member_organizationId_idx" ON neon_auth.member USING btree ("organizationId");


--
-- Name: member_userId_idx; Type: INDEX; Schema: neon_auth; Owner: -
--

CREATE INDEX "member_userId_idx" ON neon_auth.member USING btree ("userId");


--
-- Name: organization_slug_uidx; Type: INDEX; Schema: neon_auth; Owner: -
--

CREATE UNIQUE INDEX organization_slug_uidx ON neon_auth.organization USING btree (slug);


--
-- Name: session_userId_idx; Type: INDEX; Schema: neon_auth; Owner: -
--

CREATE INDEX "session_userId_idx" ON neon_auth.session USING btree ("userId");


--
-- Name: verification_identifier_idx; Type: INDEX; Schema: neon_auth; Owner: -
--

CREATE INDEX verification_identifier_idx ON neon_auth.verification USING btree (identifier);


--
-- Name: ix_budgets_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_budgets_id ON public.budgets USING btree (id);


--
-- Name: ix_changelog_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_changelog_id ON public.changelog USING btree (id);


--
-- Name: ix_records_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_records_id ON public.records USING btree (id);


--
-- Name: ix_users_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_users_id ON public.users USING btree (id);


--
-- Name: ix_users_username; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_users_username ON public.users USING btree (username);


--
-- Name: account account_userId_fkey; Type: FK CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.account
    ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES neon_auth."user"(id) ON DELETE CASCADE;


--
-- Name: invitation invitation_inviterId_fkey; Type: FK CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.invitation
    ADD CONSTRAINT "invitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES neon_auth."user"(id) ON DELETE CASCADE;


--
-- Name: invitation invitation_organizationId_fkey; Type: FK CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.invitation
    ADD CONSTRAINT "invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES neon_auth.organization(id) ON DELETE CASCADE;


--
-- Name: member member_organizationId_fkey; Type: FK CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.member
    ADD CONSTRAINT "member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES neon_auth.organization(id) ON DELETE CASCADE;


--
-- Name: member member_userId_fkey; Type: FK CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.member
    ADD CONSTRAINT "member_userId_fkey" FOREIGN KEY ("userId") REFERENCES neon_auth."user"(id) ON DELETE CASCADE;


--
-- Name: session session_userId_fkey; Type: FK CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.session
    ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES neon_auth."user"(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict iCwDHw3SWFOdEbcJHXOibRBGSWefcr53kbhR0ShxDir7fT1uNJA33eRy6wRXMeY

