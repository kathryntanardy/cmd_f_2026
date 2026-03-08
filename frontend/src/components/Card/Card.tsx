import React from "react";
import { MapPin } from "lucide-react";
import "./Card.css";

type CardProps = {
    name: string;
    age: number;
    distance: string;
    description: string;
    image: string;
    tags: string[];
};

const Card: React.FC<CardProps> = ({
    name,
    age,
    distance,
    description,
    image,
    tags,
}) => {
    return (
        <div className="card">
            <img src={image} alt={name} className="card__image" />

            <div className="card__overlay" />

            <div className="card__info">
                <h2 className="card__name">
                    {name}, {age}
                </h2>

                <div className="card__location">
                    <MapPin size={16} strokeWidth={2.2} />
                    <span>{distance}</span>
                </div>

                <p className="card__description">{description}</p>

                <div className="card__tags">
                    {tags.map((tag) => (
                        <span key={tag} className="card__tag">
                            {tag}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Card;