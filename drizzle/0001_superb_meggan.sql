CREATE TABLE `inference_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`product` varchar(255) NOT NULL,
	`brand` varchar(255) NOT NULL,
	`region` varchar(255) NOT NULL,
	`price` varchar(64) NOT NULL,
	`inwardDate` varchar(32) NOT NULL,
	`predictionDays` varchar(32) NOT NULL,
	`requestPayload` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inference_history_id` PRIMARY KEY(`id`)
);
