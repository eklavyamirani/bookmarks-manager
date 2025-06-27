using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace bookmark_manager_backend.Models.Generated;

public partial class SavedLink
{
    public int Id { get; set; }

    public required string Link { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? ReadDate { get; set; }

    public string? IpAddress { get; set; }

    public string? Title { get; set; }
}
