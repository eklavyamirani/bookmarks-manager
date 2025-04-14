using System;
using System.Collections.Generic;

namespace bookmark_manager_backend.Models.Generated;

public partial class SavedLink
{
    public int Id { get; set; }

    public string? Link { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? ReadDate { get; set; }

    public string? IpAddress { get; set; }

    public string? Title { get; set; }
}
