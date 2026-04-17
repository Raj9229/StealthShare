CREATE TABLE "access_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"file_id" integer NOT NULL,
	"token" text NOT NULL,
	"expiry_time" timestamp NOT NULL,
	"max_attempts" integer NOT NULL,
	"attempts_used" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "access_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"filename" text NOT NULL,
	"size" bigint NOT NULL,
	"upload_date" timestamp DEFAULT now() NOT NULL,
	"encrypted_file_path" text NOT NULL,
	"iv" text NOT NULL,
	"salt" text NOT NULL,
	"max_downloads" integer DEFAULT 100 NOT NULL,
	"downloads_count" integer DEFAULT 0 NOT NULL,
	"expiry_time" timestamp,
	"self_destruct" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "access_tokens" ADD CONSTRAINT "access_tokens_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;